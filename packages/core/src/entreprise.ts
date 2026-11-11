/**
 * Entreprise (SASU) : synchro Tiime → Supabase (lecture seule, ADR 0010) et pilotage.
 * Les conversions (`vers*`) sont pures et testées ; `synchroniserTiime` les applique et écrit en base par upsert
 * (clé = identifiant Tiime), donc relancer une synchro ne crée pas de doublon.
 */
import type { KvaliaClient } from "./supabase";
import type { TablesInsert } from "./database.types";
import type {
  ClientTiime,
  CompteBancaireTiime,
  FactureTiime,
  JetonsTiime,
  MetadonneeTiime,
  NoteFraisTiime,
  StockageJetons,
  TrajetTiime,
  TransactionTiime,
} from "./tiime";

const FOURNISSEUR = "tiime";
/** Recouvrement à chaque synchro : Tiime complète parfois des transactions après coup (libellé, catégorie). */
const RECOUVREMENT_JOURS = 10;
/** Statuts de facture qui ne comptent pas dans le CA (brouillon, annulée). */
const STATUTS_HORS_CA = new Set(["draft", "cancelled", "canceled"]);

// ---------------------------------------------------------------------------
// Jetons Tiime dans `connexions_externes` (lisible par la seule clé service role)
// ---------------------------------------------------------------------------

export function stockageJetonsSupabase(db: KvaliaClient, userId: string): StockageJetons {
  return {
    async lire() {
      const { data, error } = await db
        .from("connexions_externes")
        .select("jeton_acces, acces_expire_le, jeton_rafraichissement")
        .eq("user_id", userId)
        .eq("fournisseur", FOURNISSEUR)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { acces: data.jeton_acces, acces_expire_le: data.acces_expire_le, rafraichissement: data.jeton_rafraichissement };
    },
    async ecrire(j: JetonsTiime) {
      const { error } = await db.from("connexions_externes").upsert(
        {
          user_id: userId,
          fournisseur: FOURNISSEUR,
          jeton_acces: j.acces,
          acces_expire_le: j.acces_expire_le,
          jeton_rafraichissement: j.rafraichissement,
        },
        { onConflict: "user_id,fournisseur" },
      );
      if (error) throw error;
    },
  };
}

// ---------------------------------------------------------------------------
// Conversions Tiime → lignes KVALIA
// ---------------------------------------------------------------------------

/** Nombre d'une métadonnée Tiime : `12.5`, `{ value: 12.5 }`, ou liste par taux avec une entrée `total`. */
export function montantMeta(meta: MetadonneeTiime[] | undefined, cle: string): number {
  const v = meta?.find((m) => m.key === cle)?.value;
  const lire = (x: unknown): number | null => {
    if (typeof x === "number") return x;
    if (x && typeof x === "object" && !Array.isArray(x) && "value" in x) return lire((x as { value: unknown }).value);
    if (Array.isArray(x)) {
      const total = x.find((e) => e && typeof e === "object" && (e as { key?: string }).key === "total");
      return total ? lire((total as { value: unknown }).value) : null;
    }
    return null;
  };
  return lire(v) ?? 0;
}

const jourIso = (s: string | undefined | null): string | null => (s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null);
const texte = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const nombre = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null;

export function versCompte(c: CompteBancaireTiime, userId: string, maintenant: Date): TablesInsert<"comptes"> {
  return {
    user_id: userId,
    nom: c.name?.trim() || "Compte pro",
    banque: c.bank_name?.trim() || "Tiime",
    perimetre: "sasu",
    source: "tiime",
    externe_id: String(c.id),
    solde: c.balance_amount ?? null,
    devise: c.balance_currency || "EUR",
    derniere_sync: maintenant.toISOString(),
    actif: c.enabled !== false && c.closed !== true,
  };
}

export function versTransaction(t: TransactionTiime, compteId: string, userId: string): TablesInsert<"transactions"> | null {
  const jour = jourIso(t.transaction_date) ?? jourIso(t.realization_date);
  if (!jour) return null;
  const imputation = t.imputations?.find((i) => i.label);
  const libelle = texte(t.wording) ?? texte(t.original_wording) ?? "Opération";
  return {
    user_id: userId,
    compte_id: compteId,
    jour,
    montant: t.amount,
    libelle,
    libelle_brut: texte(t.original_wording),
    externe_id: String(t.id),
    empreinte: `tiime:${t.id}`,
    categorie_externe: texte(imputation?.label?.label) ?? texte(imputation?.label?.name),
    nb_justificatifs: (t.count_documents ?? 0) + (t.count_invoices ?? 0),
  };
}

export function versFacture(f: FactureTiime, userId: string): TablesInsert<"factures"> {
  return {
    user_id: userId,
    source: "tiime",
    externe_id: String(f.id),
    numero: texte(f.compiled_number),
    titre: texte(f.title),
    client: texte(f.client_name),
    statut: f.status || "inconnu",
    emise_le: jourIso(f.emission_date),
    montant_ht: f.total_excluding_taxes ?? 0,
    montant_ttc: f.total_including_taxes ?? 0,
  };
}

export function versNoteFrais(n: NoteFraisTiime, userId: string): TablesInsert<"notes_frais"> {
  return {
    user_id: userId,
    source: "tiime",
    externe_id: String(n.id),
    nom: texte(n.name),
    jour: jourIso(n.date),
    type: n.expense_type || "advanced_expense",
    statut: texte(n.lifecycle_status),
    statut_paiement: texte(n.payment_status),
    montant: montantMeta(n.metadata, "amount"),
    montant_tva: montantMeta(n.metadata, "vat_amount"),
    commentaire: texte(n.comment),
  };
}

/** Trajet : modèle non documenté, on lit les noms connus (création : date, distance, departure_address, arrival_address, round_trip). */
export function versTrajet(t: TrajetTiime, userId: string): TablesInsert<"trajets"> | null {
  const jour = jourIso(texte(t.date));
  if (!jour) return null;
  const adresse = (v: unknown) =>
    texte(v) ?? (v && typeof v === "object" ? texte((v as Record<string, unknown>).label ?? (v as Record<string, unknown>).address) : null);
  return {
    user_id: userId,
    source: "tiime",
    externe_id: String(t.id),
    jour,
    depart: adresse(t.departure_address),
    arrivee: texte(t.arrival_company_name) ?? adresse(t.arrival_address),
    distance_km: nombre(t.total_distance) ?? nombre(t.distance) ?? 0,
    aller_retour: t.round_trip === true,
    montant: nombre(t.amount) ?? nombre(t.estimated_amount),
    commentaire: texte(t.comment),
    brut: t as never,
  };
}

// ---------------------------------------------------------------------------
// Synchro
// ---------------------------------------------------------------------------

export type BilanSynchro = {
  depuis: string;
  comptes: number;
  transactions: number;
  factures: number;
  notes_frais: number;
  trajets: number;
  avertissements: string[];
};

/** Date de départ des transactions : dernière synchro − recouvrement, sinon 1er janvier de l'année précédente. */
export function debutSynchro(derniereSync: string | null, maintenant: Date): string {
  if (!derniereSync) return `${maintenant.getUTCFullYear() - 1}-01-01`;
  const d = new Date(derniereSync);
  d.setUTCDate(d.getUTCDate() - RECOUVREMENT_JOURS);
  return d.toISOString().slice(0, 10);
}

async function upsert<T extends "factures" | "notes_frais" | "trajets" | "transactions">(
  db: KvaliaClient,
  table: T,
  lignes: TablesInsert<T>[],
  onConflict: string,
): Promise<void> {
  for (let i = 0; i < lignes.length; i += 500) {
    const { error } = await db.from(table).upsert(lignes.slice(i, i + 500) as never, { onConflict });
    if (error) throw error;
  }
}

/**
 * Lit Tiime (banque, factures, notes de frais, trajets) et met à jour les tables. Aucune écriture vers Tiime.
 * Une ressource refusée par Tiime (403/404) n'arrête pas les autres : elle est signalée dans `avertissements`.
 */
export async function synchroniserTiime(
  db: KvaliaClient,
  userId: string,
  client: Pick<ClientTiime, "comptesBancaires" | "transactions" | "factures" | "notesFrais" | "trajets">,
  options: { depuis?: string; maintenant?: Date } = {},
): Promise<BilanSynchro> {
  const maintenant = options.maintenant ?? new Date();
  const { data: connexion, error: errConnexion } = await db
    .from("connexions_externes")
    .select("derniere_sync")
    .eq("user_id", userId)
    .eq("fournisseur", FOURNISSEUR)
    .maybeSingle();
  if (errConnexion) throw errConnexion;
  const depuis = options.depuis ?? debutSynchro(connexion?.derniere_sync ?? null, maintenant);
  const bilan: BilanSynchro = { depuis, comptes: 0, transactions: 0, factures: 0, notes_frais: 0, trajets: 0, avertissements: [] };

  const etape = async (nom: string, fn: () => Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      const e = err as { name?: string; code?: string; message?: string };
      // Les erreurs de connexion (jeton, code SMS) arrêtent tout : rien ne marchera sans.
      if (e.name === "ErreurTiime" && ["identifiants_manquants", "mfa_requis", "connexion_refusee"].includes(e.code ?? "")) throw err;
      if (e.name !== "ErreurTiime") throw err;
      bilan.avertissements.push(`${nom} : ${e.message}`);
    }
  };

  await etape("banque", async () => {
    for (const c of await client.comptesBancaires()) {
      const ligne = versCompte(c, userId, maintenant);
      const { data: existant, error } = await db
        .from("comptes")
        .select("id")
        .eq("user_id", userId)
        .eq("source", "tiime")
        .eq("externe_id", String(c.id))
        .maybeSingle();
      if (error) throw error;
      let compteId: string;
      if (existant) {
        const { error: e } = await db.from("comptes").update(ligne).eq("id", existant.id);
        if (e) throw e;
        compteId = existant.id;
      } else {
        const { data: cree, error: e } = await db.from("comptes").insert(ligne).select("id").single();
        if (e) throw e;
        compteId = cree.id;
      }
      bilan.comptes++;
      const lignes = (await client.transactions(c.id, depuis)).map((t) => versTransaction(t, compteId, userId)).filter((l) => l !== null);
      await upsert(db, "transactions", lignes, "compte_id,empreinte");
      bilan.transactions += lignes.length;
    }
  });

  await etape("factures", async () => {
    const lignes = (await client.factures()).map((f) => versFacture(f, userId));
    await upsert(db, "factures", lignes, "user_id,source,externe_id");
    bilan.factures = lignes.length;
  });

  await etape("notes de frais", async () => {
    const lignes = (await client.notesFrais()).map((n) => versNoteFrais(n, userId));
    await upsert(db, "notes_frais", lignes, "user_id,source,externe_id");
    bilan.notes_frais = lignes.length;
  });

  await etape("trajets", async () => {
    const lignes = (await client.trajets()).map((t) => versTrajet(t, userId)).filter((l) => l !== null);
    await upsert(db, "trajets", lignes, "user_id,source,externe_id");
    bilan.trajets = lignes.length;
  });

  const { error } = await db
    .from("connexions_externes")
    .upsert({ user_id: userId, fournisseur: FOURNISSEUR, derniere_sync: maintenant.toISOString() }, { onConflict: "user_id,fournisseur" });
  if (error) throw error;
  return bilan;
}

// ---------------------------------------------------------------------------
// Pilotage
// ---------------------------------------------------------------------------

export type PilotageSasu = {
  annee: number;
  derniere_sync: string | null;
  factures: { emises: number; ca_facture_ht: number; ca_facture_ttc: number; payees: number; encaisse_ttc: number; en_attente: number; en_attente_ttc: number };
  banque: { solde: number | null; entrees: number; sorties: number; operations: number; sans_justificatif: number };
  notes_frais: { nombre: number; montant: number; a_rembourser: number };
  indemnites_km: { trajets: number; km: number; montant: number | null };
};

const arrondi = (n: number) => Math.round(n * 100) / 100;

/**
 * Chiffres de l'année pour la SASU, à partir des tables synchronisées.
 * CA facturé = factures émises dans l'année hors brouillons et annulées ; encaissé = celles au statut « paid »
 * (Tiime ne donne pas la date de paiement dans la liste : on les rattache à l'année d'émission).
 */
export async function pilotageSasu(db: KvaliaClient, userId: string, annee: number): Promise<PilotageSasu> {
  const debut = `${annee}-01-01`;
  const fin = `${annee}-12-31`;

  const [factures, comptes, notes, trajets, connexion] = await Promise.all([
    db.from("factures").select("statut, montant_ht, montant_ttc").eq("user_id", userId).gte("emise_le", debut).lte("emise_le", fin),
    db.from("comptes").select("id, solde, actif").eq("user_id", userId).eq("perimetre", "sasu"),
    db.from("notes_frais").select("montant, statut_paiement, statut").eq("user_id", userId).gte("jour", debut).lte("jour", fin),
    db.from("trajets").select("distance_km, montant").eq("user_id", userId).gte("jour", debut).lte("jour", fin),
    db.from("connexions_externes").select("derniere_sync").eq("user_id", userId).eq("fournisseur", FOURNISSEUR).maybeSingle(),
  ]);
  for (const r of [factures, comptes, notes, trajets, connexion]) if (r.error) throw r.error;

  const fact = (factures.data ?? []).filter((f) => !STATUTS_HORS_CA.has(f.statut));
  const payees = fact.filter((f) => f.statut === "paid");
  const attente = fact.filter((f) => f.statut !== "paid");
  const somme = <T>(xs: T[], f: (x: T) => number | string | null) => arrondi(xs.reduce((a, x) => a + Number(f(x) ?? 0), 0));

  const comptesSasu = comptes.data ?? [];
  const ids = comptesSasu.map((c) => c.id);
  let ops: { montant: number; nb_justificatifs: number | null }[] = [];
  if (ids.length) {
    const { data, error } = await db
      .from("transactions")
      .select("montant, nb_justificatifs")
      .eq("user_id", userId)
      .in("compte_id", ids)
      .gte("jour", debut)
      .lte("jour", fin);
    if (error) throw error;
    ops = data ?? [];
  }
  const actifs = comptesSasu.filter((c) => c.actif && c.solde !== null);

  const notesRetenues = (notes.data ?? []).filter((n) => n.statut !== "draft");
  const traj = trajets.data ?? [];
  const montantsIk = traj.map((t) => (t.montant === null ? null : Number(t.montant)));

  return {
    annee,
    derniere_sync: connexion.data?.derniere_sync ?? null,
    factures: {
      emises: fact.length,
      ca_facture_ht: somme(fact, (f) => f.montant_ht),
      ca_facture_ttc: somme(fact, (f) => f.montant_ttc),
      payees: payees.length,
      encaisse_ttc: somme(payees, (f) => f.montant_ttc),
      en_attente: attente.length,
      en_attente_ttc: somme(attente, (f) => f.montant_ttc),
    },
    banque: {
      solde: actifs.length ? somme(actifs, (c) => c.solde) : null,
      entrees: somme(
        ops.filter((o) => Number(o.montant) > 0),
        (o) => o.montant,
      ),
      sorties: somme(
        ops.filter((o) => Number(o.montant) < 0),
        (o) => o.montant,
      ),
      operations: ops.length,
      sans_justificatif: ops.filter((o) => Number(o.montant) < 0 && o.nb_justificatifs === 0).length,
    },
    notes_frais: {
      nombre: notesRetenues.length,
      montant: somme(notesRetenues, (n) => n.montant),
      a_rembourser: somme(
        notesRetenues.filter((n) => n.statut_paiement !== "paid"),
        (n) => n.montant,
      ),
    },
    indemnites_km: {
      trajets: traj.length,
      km: somme(traj, (t) => t.distance_km),
      montant: montantsIk.some((m) => m !== null) ? arrondi(montantsIk.reduce<number>((a, m) => a + (m ?? 0), 0)) : null,
    },
  };
}
