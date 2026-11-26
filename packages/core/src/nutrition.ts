/**
 * Nutrition : la cible calorique du jour = base (réglages) + dépense sport du jour (kcal des séances, figées à
 * « Terminer ») ; le journal des repas (aliments de la base, recettes, saisie libre) ; les recettes de départ ; et
 * les suggestions : selon ce qu'il reste à manger, le repas du moment et le programme sportif.
 * Aliments : aliments.ts. Recettes de départ : recettes-base.ts (généré).
 */
import { z } from "zod";
import { aliment } from "./aliments";
import { aujourdhuiIso, decalerJour, FUSEAU } from "./dates";
import { RECETTES_BASE } from "./recettes-base";
import type { KvaliaClient } from "./supabase";

/** Les repas de la journée, dans l'ordre. Collation = dans la matinée ; encas = l'après-midi, autour de la séance. */
export const Repas = z.enum(["petit_dej", "collation", "dejeuner", "encas", "diner"]);
export type Repas = z.infer<typeof Repas>;
export const REPAS: Repas[] = ["petit_dej", "collation", "dejeuner", "encas", "diner"];
export const LIBELLES_REPAS: Record<Repas, string> = {
  petit_dej: "Petit-déjeuner",
  collation: "Collation",
  dejeuner: "Déjeuner",
  encas: "Encas",
  diner: "Dîner",
};
export const ICONES_REPAS: Record<Repas, string> = {
  petit_dej: "bakery_dining",
  collation: "nutrition",
  dejeuner: "restaurant",
  encas: "cookie",
  diner: "dinner_dining",
};
/** Part de la cible du jour pour chaque repas (repère pour les suggestions, pas une contrainte). */
export const PART_REPAS: Record<Repas, number> = { petit_dej: 0.25, collation: 0.08, dejeuner: 0.32, encas: 0.1, diner: 0.25 };

/** Le repas du moment, à l'heure de l'utilisateur (Europe/Paris). */
export function repasDuMoment(maintenant = new Date()): Repas {
  const h = Number(new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU, hour: "2-digit", hour12: false }).format(maintenant).slice(0, 2));
  if (h < 10) return "petit_dej";
  if (h < 12) return "collation";
  if (h < 15) return "dejeuner";
  if (h < 19) return "encas";
  return "diner";
}

/** Cibles de macros du jour : protéines des réglages, lipides ≈ 28 % de l'énergie, glucides = le reste. */
export function cibleMacros(cibleKcal: number, proteinesG: number): { prot: number; gluc: number; lip: number } {
  const lip = Math.round((cibleKcal * 0.28) / 9);
  return { prot: proteinesG, lip, gluc: Math.max(0, Math.round((cibleKcal - proteinesG * 4 - lip * 9) / 4)) };
}

export const ParametresNutrition = z.object({
  /** Dépense de base + activité hors sport (TDEE sans séance). */
  cible_kcal: z.number().int().min(1000).max(6000).default(2200),
  proteines_g: z.number().int().min(50).max(400).default(160),
  /** Reverser les kcal brûlées dans la cible du jour. */
  ajuster_avec_sport: z.boolean().default(true),
});
export type ParametresNutrition = z.infer<typeof ParametresNutrition>;
export const PARAMETRES_NUTRITION_DEFAUT: ParametresNutrition = ParametresNutrition.parse({});

export async function parametresNutrition(db: KvaliaClient, userId: string): Promise<ParametresNutrition> {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const brut = (data?.reglages as Record<string, unknown> | null)?.nutrition ?? {};
  const r = ParametresNutrition.safeParse(brut);
  return r.success ? r.data : PARAMETRES_NUTRITION_DEFAUT;
}

export async function enregistrerParametresNutrition(db: KvaliaClient, userId: string, params: ParametresNutrition) {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const reglages = { ...((data?.reglages as Record<string, unknown>) ?? {}), nutrition: params };
  const { error } = await db.from("profils").update({ reglages }).eq("id", userId);
  if (error) throw error;
}

/** Bilan énergétique du jour : base, brûlé par le sport, cible ajustée, consommé (journal), reste. */
export async function bilanJour(db: KvaliaClient, userId: string, jour: string) {
  const params = await parametresNutrition(db, userId);
  const [{ data: seances }, { data: repas }] = await Promise.all([
    db.from("seances").select("id, titre, type, etat, kcal").eq("user_id", userId).eq("jour", jour),
    db.from("journal_repas").select("kcal, prot, gluc, lip, fibres").eq("user_id", userId).eq("jour", jour),
  ]);
  const brule = (seances ?? []).reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const consomme = (repas ?? []).reduce((a, r) => a + Number(r.kcal ?? 0), 0);
  const proteines = (repas ?? []).reduce((a, r) => a + Number(r.prot ?? 0), 0);
  const somme = (k: "gluc" | "lip" | "fibres") => Math.round((repas ?? []).reduce((a, r) => a + Number(r[k] ?? 0), 0));
  const cible = params.cible_kcal + (params.ajuster_avec_sport ? brule : 0);
  return {
    glucides: somme("gluc"),
    lipides: somme("lip"),
    fibres: somme("fibres"),
    macros_cible: cibleMacros(cible, params.proteines_g),
    jour,
    base: params.cible_kcal,
    brule,
    cible,
    consomme: Math.round(consomme),
    reste: Math.round(cible - consomme),
    proteines: Math.round(proteines),
    proteines_cible: params.proteines_g,
    seances: (seances ?? []).map((s) => ({ id: s.id, titre: s.titre, type: s.type, etat: s.etat, kcal: Number(s.kcal ?? 0) })),
  };
}

// ---------- Journal des repas ----------

export const EntreeJournal = z.object({
  jour: z.string().date().optional().describe("Jour concerné (aujourd'hui par défaut)"),
  repas: Repas.optional().describe("petit_dej, collation (matin), dejeuner, encas (après-midi), diner ; par défaut le repas du moment"),
  aliment_id: z.string().optional().describe("Identifiant d'un aliment trouvé par chercher_aliment (avec quantite_g)"),
  quantite_g: z.number().positive().max(5000).optional().describe("Quantité en grammes (ou ml) pour un aliment"),
  recette_id: z.string().uuid().optional().describe("Identifiant d'une recette (avec portions)"),
  portions: z.number().positive().max(10).optional().describe("Nombre de portions de la recette (1 par défaut)"),
  libelle: z.string().trim().min(1).max(120).optional().describe("Saisie libre : ce qui a été mangé (avec kcal)"),
  kcal: z.number().min(0).max(5000).optional(),
  prot: z.number().min(0).max(500).optional(),
  gluc: z.number().min(0).max(1000).optional(),
  lip: z.number().min(0).max(500).optional(),
});
export type EntreeJournal = z.input<typeof EntreeJournal>;

const arrondi1 = (x: number) => Math.round(x * 10) / 10;

/**
 * Ajoute une ligne au journal : un aliment de la base (macros = valeurs pour 100 g × quantité), une recette
 * (macros par portion × portions) ou une saisie libre. Les macros sont figées dans la ligne au moment de la saisie.
 */
export async function ajouterAuJournal(db: KvaliaClient, userId: string, entree: EntreeJournal, source: "manuel" | "phrase" | "plan" = "manuel") {
  const e = EntreeJournal.parse(entree);
  const jour = e.jour ?? aujourdhuiIso();
  const repas = e.repas ?? repasDuMoment();
  let ligne: {
    libelle: string;
    kcal: number;
    prot: number;
    gluc: number;
    lip: number;
    fibres: number | null;
    aliment_id?: string;
    quantite_g?: number;
    recette_id?: string;
    portions: number;
  };
  if (e.aliment_id) {
    const a = await aliment(db, e.aliment_id);
    if (!a) throw new Error("Aliment introuvable : relance la recherche.");
    const g = e.quantite_g ?? a.portion_g ?? 100;
    const f = g / 100;
    ligne = {
      libelle: a.marque ? `${a.nom} · ${a.marque}` : a.nom,
      kcal: Math.round(a.kcal * f),
      prot: arrondi1(a.prot * f),
      gluc: arrondi1(a.gluc * f),
      lip: arrondi1(a.lip * f),
      fibres: a.fibres == null ? null : arrondi1(a.fibres * f),
      aliment_id: a.id,
      quantite_g: g,
      portions: 1,
    };
  } else if (e.recette_id) {
    const { data: r, error } = await db.from("recettes").select("id, nom, kcal, prot, gluc, lip, fibres").eq("id", e.recette_id).eq("user_id", userId).single();
    if (error) throw error;
    const p = e.portions ?? 1;
    ligne = {
      libelle: r.nom,
      kcal: Math.round(Number(r.kcal ?? 0) * p),
      prot: arrondi1(Number(r.prot ?? 0) * p),
      gluc: arrondi1(Number(r.gluc ?? 0) * p),
      lip: arrondi1(Number(r.lip ?? 0) * p),
      fibres: r.fibres == null ? null : arrondi1(Number(r.fibres) * p),
      recette_id: r.id,
      portions: p,
    };
  } else if (e.libelle && e.kcal !== undefined) {
    ligne = { libelle: e.libelle, kcal: Math.round(e.kcal), prot: e.prot ?? 0, gluc: e.gluc ?? 0, lip: e.lip ?? 0, fibres: null, portions: 1 };
  } else {
    throw new Error("Donner un aliment (aliment_id + quantite_g), une recette (recette_id) ou une saisie libre (libelle + kcal).");
  }
  const { data, error } = await db
    .from("journal_repas")
    .insert({ user_id: userId, jour, repas, source, ...ligne })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id, jour, repas, libelle: ligne.libelle, kcal: ligne.kcal, prot: ligne.prot, gluc: ligne.gluc, lip: ligne.lip };
}

/** Retire une ligne du journal. */
export async function supprimerDuJournal(db: KvaliaClient, userId: string, id: string) {
  const { data, error } = await db.from("journal_repas").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return { id, supprime: false };
  const { error: errDel } = await db.from("journal_repas").delete().eq("id", id).eq("user_id", userId);
  if (errDel) throw errDel;
  return { id, supprime: true };
}

export type LigneJournal = {
  id: string;
  repas: Repas;
  libelle: string;
  kcal: number;
  prot: number;
  gluc: number;
  lip: number;
  quantite_g: number | null;
  portions: number;
  recette_id: string | null;
};

/** Le journal d'un jour : bilan (cible, mangé, reste, macros) et lignes regroupées par repas, dans l'ordre de la journée. */
export async function journalDuJour(db: KvaliaClient, userId: string, jour = aujourdhuiIso()) {
  const [bilan, { data, error }] = await Promise.all([
    bilanJour(db, userId, jour),
    db
      .from("journal_repas")
      .select("id, repas, libelle, kcal, prot, gluc, lip, quantite_g, portions, recette_id, created_at")
      .eq("user_id", userId)
      .eq("jour", jour)
      .order("created_at"),
  ]);
  if (error) throw error;
  const lignes: LigneJournal[] = (data ?? []).map((l) => ({
    id: l.id,
    repas: Repas.safeParse(l.repas).success ? (l.repas as Repas) : "encas",
    libelle: l.libelle ?? "Sans nom",
    kcal: Math.round(Number(l.kcal ?? 0)),
    prot: Number(l.prot ?? 0),
    gluc: Number(l.gluc ?? 0),
    lip: Number(l.lip ?? 0),
    quantite_g: l.quantite_g == null ? null : Number(l.quantite_g),
    portions: Number(l.portions ?? 1),
    recette_id: l.recette_id,
  }));
  const repas = REPAS.map((r) => {
    const ls = lignes.filter((l) => l.repas === r);
    return { repas: r, libelle: LIBELLES_REPAS[r], kcal: ls.reduce((a, l) => a + l.kcal, 0), lignes: ls };
  });
  return { ...bilan, repas };
}

// ---------- Parcours du jour : où en est chaque repas, refaire un repas ----------

/** Où en est un repas dans la journée : déjà noté, passé sans rien, c'est le moment, ou à venir. */
export type EtatRepas = "note" | "passe" | "maintenant" | "a_venir";

/**
 * Pour chaque repas du jour : son état et, tant qu'il n'est pas noté, les calories conseillées (`budgetRepas`).
 * `moment` = repas du moment si le jour est aujourd'hui ; `null` pour un autre jour (rien n'est « maintenant »).
 * `focus` = le repas à mettre en avant : celui du moment, sinon rien.
 */
export function parcoursRepas(
  j: { cible: number; reste: number; repas: Array<{ repas: Repas; kcal: number; lignes: unknown[] }> },
  moment: Repas | null,
): { focus: Repas | null; repas: Array<{ repas: Repas; etat: EtatRepas; conseille_kcal: number }> } {
  const saisis = j.repas.filter((r) => r.lignes.length).map((r) => r.repas);
  const iMoment = moment ? REPAS.indexOf(moment) : -1;
  return {
    focus: moment,
    repas: j.repas.map((r) => {
      const i = REPAS.indexOf(r.repas);
      const etat: EtatRepas = r.repas === moment ? "maintenant" : r.lignes.length ? "note" : moment && i > iMoment ? "a_venir" : "passe";
      const conseille = etat === "note" || etat === "passe" ? 0 : budgetRepas({ repas: r.repas, cible: j.cible, reste: j.reste, repas_saisis: saisis });
      return { repas: r.repas, etat, conseille_kcal: conseille };
    }),
  };
}

/** La dernière fois qu'un repas a été noté avant `jour` : de quoi le refaire d'un geste. */
export type RepasPrecedent = { jour: string; kcal: number; libelles: string[] };

const COLONNES_COPIE = "repas, jour, libelle, kcal, prot, gluc, lip, fibres, aliment_id, quantite_g, recette_id, portions";

/** Pour chaque repas, sa dernière occurrence dans les 14 jours avant `jour` (rien si jamais noté). */
export async function derniersRepas(db: KvaliaClient, userId: string, jour = aujourdhuiIso()): Promise<Partial<Record<Repas, RepasPrecedent>>> {
  const { data, error } = await db
    .from("journal_repas")
    .select("repas, jour, libelle, kcal")
    .eq("user_id", userId)
    .lt("jour", jour)
    .gte("jour", decalerJour(jour, -14))
    .order("jour", { ascending: false })
    .limit(300);
  if (error) throw error;
  const sortie: Partial<Record<Repas, RepasPrecedent>> = {};
  for (const l of data ?? []) {
    const r = Repas.safeParse(l.repas);
    if (!r.success) continue;
    const vu = sortie[r.data];
    if (vu && vu.jour !== l.jour) continue;
    const cible: RepasPrecedent = vu ?? { jour: l.jour, kcal: 0, libelles: [] };
    sortie[r.data] = cible;
    cible.kcal += Math.round(Number(l.kcal ?? 0));
    cible.libelles.push(l.libelle ?? "Sans nom");
  }
  return sortie;
}

export const EntreeRepeterRepas = z.object({
  repas: Repas.describe("Le repas à refaire"),
  jour: z.string().date().optional().describe("Jour où le noter (aujourd'hui par défaut)"),
  depuis: z.string().date().optional().describe("Jour à recopier (par défaut : la dernière fois que ce repas a été noté, dans les 14 jours)"),
});

/**
 * Refait un repas : recopie dans `jour` les lignes de ce repas telles qu'elles ont été notées la dernière fois
 * (ou le jour `depuis`), macros comprises.
 */
export async function repeterRepas(db: KvaliaClient, userId: string, entree: z.input<typeof EntreeRepeterRepas>) {
  const e = EntreeRepeterRepas.parse(entree);
  const jour = e.jour ?? aujourdhuiIso();
  const depuis = e.depuis ?? (await derniersRepas(db, userId, jour))[e.repas]?.jour;
  if (!depuis) throw new Error(`Aucun ${LIBELLES_REPAS[e.repas].toLowerCase()} noté ces 14 derniers jours : rien à refaire.`);
  if (depuis === jour) throw new Error("Le jour à recopier est le jour lui-même.");
  const { data, error } = await db
    .from("journal_repas")
    .select(COLONNES_COPIE)
    .eq("user_id", userId)
    .eq("jour", depuis)
    .eq("repas", e.repas)
    .order("created_at");
  if (error) throw error;
  if (!data?.length) throw new Error(`Rien de noté pour ${LIBELLES_REPAS[e.repas].toLowerCase()} le ${depuis}.`);
  const lignes = data.map(({ jour: _jour, ...l }) => ({ ...l, user_id: userId, jour, source: "manuel" as const }));
  const { error: errInsert } = await db.from("journal_repas").insert(lignes);
  if (errInsert) throw errInsert;
  return { jour, repas: e.repas, depuis, lignes: lignes.length, kcal: lignes.reduce((a, l) => a + Math.round(Number(l.kcal ?? 0)), 0) };
}

// ---------- Recettes ----------

export type RecetteSortie = {
  id: string;
  nom: string;
  repas: string[];
  tags: string[];
  temps_min: number | null;
  kcal: number;
  prot: number;
  gluc: number;
  lip: number;
  fibres: number | null;
  /** Recette créée par l'utilisateur ou l'agent (pas une recette de départ). */
  perso: boolean;
  /** Nombre de fois où elle a été notée au journal : une recette déjà mangée fait partie de « Mes recettes ». */
  utilisations: number;
};
const COLONNES_RECETTE = "id, nom, repas, tags, temps_min, kcal, prot, gluc, lip, fibres, ref";

/** Importe les recettes de départ qui manquent (une fois par utilisateur, repérées par `ref`). Rend le nombre ajouté. */
export async function importerRecettesDeBase(db: KvaliaClient, userId: string): Promise<number> {
  const { data: deja, error } = await db.from("recettes").select("ref").eq("user_id", userId).not("ref", "is", null);
  if (error) throw error;
  const connus = new Set((deja ?? []).map((r) => r.ref));
  const manquantes = RECETTES_BASE.filter((r) => !connus.has(r.ref));
  if (!manquantes.length) return 0;
  const { error: errIns } = await db.from("recettes").insert(
    manquantes.map((r) => ({
      user_id: userId,
      ref: r.ref,
      nom: r.nom,
      // `type` (ancien champ, un seul repas) : le premier repas ; « collation » y devient « encas ».
      type: (r.repas[0] === "collation" ? "encas" : r.repas[0]) as "petit_dej" | "dejeuner" | "diner" | "encas",
      portions: 1,
      repas: r.repas,
      tags: r.tags,
      temps_min: r.temps_min,
      kcal: r.kcal,
      prot: r.prot,
      gluc: r.gluc,
      lip: r.lip,
      fibres: r.fibres,
      ingredients_detail: r.ingredients,
      etapes: r.etapes,
      instructions: r.etapes.join("\n"),
    })),
  );
  if (errIns) throw errIns;
  return manquantes.length;
}

/** Les recettes de l'utilisateur qui ont des macros (les recettes de départ sont importées au premier appel). */
export async function listerRecettes(db: KvaliaClient, userId: string, filtre: { repas?: Repas } = {}): Promise<RecetteSortie[]> {
  await importerRecettesDeBase(db, userId);
  const [{ data, error }, { data: notees, error: errNotees }] = await Promise.all([
    db.from("recettes").select(COLONNES_RECETTE).eq("user_id", userId).eq("actif", true).not("kcal", "is", null).order("nom"),
    db.from("journal_repas").select("recette_id").eq("user_id", userId).not("recette_id", "is", null).limit(2000),
  ]);
  if (error) throw error;
  if (errNotees) throw errNotees;
  const utilisations = new Map<string, number>();
  for (const l of notees ?? []) if (l.recette_id) utilisations.set(l.recette_id, (utilisations.get(l.recette_id) ?? 0) + 1);
  return (data ?? [])
    .filter((r) => !filtre.repas || (r.repas ?? []).includes(filtre.repas))
    .map((r) => ({
      id: r.id,
      nom: r.nom,
      repas: r.repas ?? [],
      tags: r.tags ?? [],
      temps_min: r.temps_min,
      kcal: Math.round(Number(r.kcal ?? 0)),
      prot: Math.round(Number(r.prot ?? 0)),
      gluc: Math.round(Number(r.gluc ?? 0)),
      lip: Math.round(Number(r.lip ?? 0)),
      fibres: r.fibres == null ? null : Math.round(Number(r.fibres)),
      perso: r.ref == null,
      utilisations: utilisations.get(r.id) ?? 0,
    }));
}

// ---------- Suggestions ----------

export type ContexteSport = {
  /** Objectif du programme actif (hypertrophie, force, perte_de_gras, endurance) ou `null`. */
  objectif: string | null;
  /** Une séance est prévue aujourd'hui et n'est pas encore faite. */
  seance_a_venir: boolean;
  /** Une séance a été faite aujourd'hui. */
  seance_faite: boolean;
};

export type Suggestion = RecetteSortie & { portions: number; raison: string };

const PORTIONS = [1, 0.5, 1.5, 2];
const nf = (n: number) => n.toLocaleString("fr-FR");

/**
 * Classe les recettes pour un repas et un budget de calories : au plus près du budget sans le dépasser, en comblant
 * les protéines qui manquent, et selon le sport — glucides avant la séance, protéines après, léger en sèche, dense en
 * prise de muscle. Fonction pure (testable) ; `suggererRepas` l'alimente depuis la base.
 */
export function classerSuggestions(
  recettes: RecetteSortie[],
  p: { repas: Repas; budget_kcal: number; reste_proteines: number; sport: ContexteSport; max?: number },
): Suggestion[] {
  if (p.budget_kcal < 80) return [];
  const petit = p.repas === "collation" || p.repas === "encas";
  const candidates: Array<Suggestion & { score: number }> = [];
  for (const r of recettes) {
    const convient = r.repas.includes(p.repas) || (petit && (r.repas.includes("collation") || r.repas.includes("encas")));
    if (!convient) continue;
    let meilleur: (Suggestion & { score: number }) | null = null;
    for (const portions of PORTIONS) {
      // Un plat se propose jusqu'à une portion et demie ; doubler n'a de sens que pour une collation.
      if (portions > 1.5 && !petit) continue;
      const kcal = r.kcal * portions;
      if (kcal > p.budget_kcal * 1.1 || kcal < 60) continue;
      const prot = r.prot * portions;
      let score = 100 - (Math.abs(p.budget_kcal - kcal) / p.budget_kcal) * 100;
      if (p.reste_proteines > 0) score += (Math.min(prot, p.reste_proteines) / Math.max(20, p.reste_proteines)) * 40;
      const raisons: string[] = [];
      const a = (tag: string) => r.tags.includes(tag);
      if (p.sport.seance_a_venir && a("avant_seance")) {
        score += 25;
        raisons.push("des glucides avant ta séance");
      }
      if (p.sport.seance_faite && a("apres_seance")) {
        score += 25;
        raisons.push("pour récupérer après ta séance");
      }
      if (p.sport.objectif === "perte_de_gras") {
        if (a("seche")) {
          score += 12;
          raisons.push("rassasiant pour peu de calories");
        }
        if (a("leger")) score += 6;
      } else if (p.sport.objectif === "hypertrophie" || p.sport.objectif === "force") {
        if (a("masse")) {
          score += 8;
          raisons.push("dense, pour ta prise de muscle");
        }
        if (a("riche_proteines")) score += 6;
      }
      if (portions !== 1) score -= 6;
      if (p.reste_proteines > 15 && prot >= 20 && !raisons.length) raisons.push(`${Math.round(prot)} g de protéines`);
      const s = {
        ...r,
        portions,
        kcal: Math.round(kcal),
        prot: Math.round(prot),
        gluc: Math.round(r.gluc * portions),
        lip: Math.round(r.lip * portions),
        raison: raisons[0] ?? "dans ton budget",
        score,
      };
      if (!meilleur || s.score > meilleur.score) meilleur = s;
    }
    if (meilleur) candidates.push(meilleur);
  }
  return candidates
    .sort((x, y) => y.score - x.score || x.nom.localeCompare(y.nom))
    .slice(0, p.max ?? 4)
    .map(({ score: _score, ...s }) => s);
}

/**
 * Budget de calories pour un repas : ce qu'il reste aujourd'hui, moins ce qu'on réserve aux repas principaux
 * encore à venir et pas encore saisis, plafonné à 1,4 × la part habituelle de ce repas.
 */
export function budgetRepas(p: { repas: Repas; cible: number; reste: number; repas_saisis: Repas[] }): number {
  if (p.reste <= 0) return 0;
  const i = REPAS.indexOf(p.repas);
  const reserve = REPAS.slice(i + 1)
    .filter((r) => (r === "petit_dej" || r === "dejeuner" || r === "diner") && !p.repas_saisis.includes(r))
    .reduce((a, r) => a + PART_REPAS[r] * p.cible, 0);
  const plafond = PART_REPAS[p.repas] * p.cible * 1.4;
  const budget = Math.min(plafond, p.reste - reserve);
  // Journée déjà chargée : on propose quand même quelque chose de petit plutôt que rien.
  return Math.round(budget >= 100 ? budget : Math.min(p.reste, 150));
}

/**
 * « Il me reste 300 kcal, je mange quoi ? » : pour le repas demandé (ou celui du moment), calcule le budget et
 * propose les recettes qui vont le mieux, selon le reste du jour, les protéines manquantes et le sport du jour.
 */
export async function suggererRepas(db: KvaliaClient, userId: string, entree: { jour?: string; repas?: Repas; budget_kcal?: number } = {}) {
  const jour = entree.jour ?? aujourdhuiIso();
  const repas = entree.repas ?? repasDuMoment();
  const [journal, recettes, { data: prog }] = await Promise.all([
    journalDuJour(db, userId, jour),
    listerRecettes(db, userId),
    db.from("programmes").select("rythme").eq("user_id", userId).eq("actif", true).maybeSingle(),
  ]);
  const sport: ContexteSport = {
    objectif: ((prog?.rythme as { objectif?: string } | null)?.objectif as string | undefined) ?? null,
    seance_a_venir: journal.seances.some((s) => s.etat === "prevue" || s.etat === "en_cours"),
    seance_faite: journal.seances.some((s) => s.etat === "faite"),
  };
  const budget =
    entree.budget_kcal ??
    budgetRepas({ repas, cible: journal.cible, reste: journal.reste, repas_saisis: journal.repas.filter((r) => r.lignes.length).map((r) => r.repas) });
  const reste_proteines = Math.max(0, journal.proteines_cible - journal.proteines);
  const suggestions = classerSuggestions(recettes, { repas, budget_kcal: budget, reste_proteines, sport });
  const message =
    journal.reste <= 0
      ? "Tu as atteint ta cible du jour."
      : suggestions.length
        ? `Il te reste ${nf(journal.reste)} kcal${reste_proteines > 0 ? ` et ${Math.round(reste_proteines)} g de protéines` : ""} : pour ${LIBELLES_REPAS[repas].toLowerCase()}, vise environ ${nf(budget)} kcal.`
        : `Il te reste ${nf(journal.reste)} kcal : pas de recette adaptée, cherche un aliment simple.`;
  return {
    jour,
    repas,
    libelle_repas: LIBELLES_REPAS[repas],
    reste_kcal: journal.reste,
    reste_proteines: Math.round(reste_proteines),
    budget_kcal: budget,
    sport,
    message,
    suggestions,
  };
}
