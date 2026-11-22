/**
 * Défis du programme (Sport) : petites habitudes chiffrées à tenir en plus des séances — « 10 000 pas par jour »,
 * « 10 min de mobilité », « 50 pompes », ou une simple case à cocher. Un défi vaut certains jours de la semaine
 * (tous par défaut) entre `debut` et `fin` (par défaut la fin du programme actif) ; on note une valeur par jour.
 * Utilisé par les outils lister_defis / creer_defi / modifier_defi / noter_defi / supprimer_defi, l'onglet Programme
 * et la Home Sport. Tables : `defis`, `defis_suivi` (migration 20261122204159_defis.sql).
 */
import { z } from "zod";
import { aujourdhuiIso, decalerJour } from "./dates";
import type { TablesUpdate } from "./database.types";
import type { KvaliaClient } from "./supabase";

export const MesureDefi = z.enum(["pas", "minutes", "repetitions", "case"]);
export type MesureDefi = z.infer<typeof MesureDefi>;

/** Affichage et saisie de chaque mesure : unité, icône (Material Symbols), pas du bouton « + » rapide, cible par défaut. */
export const MESURES_DEFI: Record<MesureDefi, { libelle: string; unite: string; icone: string; increment: number; cible: number }> = {
  pas: { libelle: "Pas", unite: "pas", icone: "directions_walk", increment: 1000, cible: 10000 },
  minutes: { libelle: "Minutes", unite: "min", icone: "timer", increment: 5, cible: 10 },
  repetitions: { libelle: "Répétitions", unite: "reps", icone: "repeat", increment: 10, cible: 50 },
  case: { libelle: "À cocher", unite: "", icone: "check_circle", increment: 1, cible: 1 },
};

/** Idées proposées à la création (l'app et l'agent partent de la même liste). */
export const DEFIS_SUGGERES: Array<{ nom: string; mesure: MesureDefi; cible: number }> = [
  { nom: "Marcher", mesure: "pas", cible: 10000 },
  { nom: "Mobilité", mesure: "minutes", cible: 10 },
  { nom: "Gainage", mesure: "minutes", cible: 5 },
  { nom: "Pompes", mesure: "repetitions", cible: 50 },
  { nom: "Étirements", mesure: "minutes", cible: 10 },
  { nom: "Pas de sucre ajouté", mesure: "case", cible: 1 },
];

const TOUS_LES_JOURS = [0, 1, 2, 3, 4, 5, 6];

export const DefiEntree = z.object({
  nom: z.string().trim().min(1).max(60).describe("Ce qu'il faut faire, ex. « Marcher », « Gainage », « Pas de sucre »"),
  mesure: MesureDefi.default("case").describe("pas, minutes, repetitions, ou case (juste fait / pas fait)"),
  cible: z.number().int().min(1).max(100000).optional().describe("Objectif du jour (ex. 10000 pas, 10 minutes, 50 reps). Ignoré pour « case »."),
  jours_semaine: z
    .array(z.number().int().min(0).max(6))
    .min(1)
    .max(7)
    .optional()
    .describe("Jours où le défi vaut (0 = dimanche … 6 = samedi). Tous les jours par défaut."),
  debut: z.string().date().optional().describe("Premier jour (aujourd'hui par défaut)"),
  fin: z.string().date().nullable().optional().describe("Dernier jour ; par défaut la fin du programme actif ; null = sans fin"),
});
export type DefiEntree = z.input<typeof DefiEntree>;

export const ModificationDefi = DefiEntree.partial().extend({
  id: z.string().uuid(),
  actif: z.boolean().optional().describe("false = mettre le défi en pause (l'historique reste)"),
});
export type ModificationDefi = z.input<typeof ModificationDefi>;

export const NotationDefi = z.object({
  defi_id: z.string().uuid(),
  jour: z.string().date().optional().describe("Jour concerné (aujourd'hui par défaut, jamais dans le futur)"),
  valeur: z.number().min(0).optional().describe("Valeur totale du jour (remplace) — ex. 8500 pas"),
  ajouter: z.number().optional().describe("Ajoute à la valeur du jour (négatif pour retirer) — ex. +1000 pas, +5 min"),
  fait: z.boolean().optional().describe("Pour un défi à cocher (ou pour marquer la cible atteinte d'un coup)"),
});
export type NotationDefi = z.input<typeof NotationDefi>;

type LigneDefi = {
  id: string;
  nom: string;
  mesure: string;
  cible: number;
  jours_semaine: number[];
  debut: string;
  fin: string | null;
  actif: boolean;
  programme_id: string | null;
};

const COLONNES = "id, nom, mesure, cible, jours_semaine, debut, fin, actif, programme_id";

const jourSemaine = (jour: string) => new Date(jour + "T12:00:00Z").getUTCDay();

/** Le défi vaut-il ce jour-là (actif, dans ses dates, un de ses jours de la semaine) ? */
export function defiValable(d: Pick<LigneDefi, "actif" | "debut" | "fin" | "jours_semaine">, jour: string): boolean {
  return d.actif && jour >= d.debut && (!d.fin || jour <= d.fin) && d.jours_semaine.includes(jourSemaine(jour));
}

function mesureDe(m: string): MesureDefi {
  return MesureDefi.safeParse(m).success ? (m as MesureDefi) : "case";
}

/** « 10 000 pas », « 10 min », « 50 reps », ou rien pour une case. */
export function libelleCible(mesure: string, cible: number): string {
  const m = MESURES_DEFI[mesureDe(mesure)];
  return m.unite ? `${cible.toLocaleString("fr-FR")} ${m.unite}` : "";
}

/** « Tous les jours », « En semaine », « Le week-end », sinon la liste des jours. */
export function libelleJours(jours: number[]): string {
  const s = [...new Set(jours)].sort((a, b) => a - b);
  if (s.length === 7) return "Tous les jours";
  if (s.join() === "1,2,3,4,5") return "En semaine";
  if (s.join() === "0,6") return "Le week-end";
  const noms = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  // Lundi d'abord, dimanche à la fin.
  return [...s.filter((j) => j > 0), ...s.filter((j) => j === 0)].map((j) => noms[j]).join(", ");
}

/**
 * Série : nombre de jours valables consécutifs où la cible est atteinte, en remontant depuis `jour`.
 * Le jour même ne casse pas la série tant qu'il n'est pas fini (on part de la veille s'il n'est pas atteint).
 */
export function serieDefi(d: Pick<LigneDefi, "actif" | "debut" | "fin" | "jours_semaine" | "cible">, valeurs: Map<string, number>, jour: string): number {
  let n = 0;
  let j = jour;
  if ((valeurs.get(j) ?? 0) < d.cible) j = decalerJour(j, -1);
  for (let garde = 0; garde < 400 && j >= d.debut; garde++, j = decalerJour(j, -1)) {
    if (!defiValable({ ...d, actif: true }, j)) continue;
    if ((valeurs.get(j) ?? 0) >= d.cible) n++;
    else break;
  }
  return n;
}

/** Lundi de la semaine de `jour`. */
function lundiDe(jour: string): string {
  return decalerJour(jour, -((jourSemaine(jour) + 6) % 7));
}

export type EtatDefi = {
  id: string;
  nom: string;
  mesure: MesureDefi;
  cible: number;
  unite: string;
  icone: string;
  increment: number;
  jours_semaine: number[];
  libelle_jours: string;
  debut: string;
  fin: string | null;
  actif: boolean;
  /** Le défi vaut ce jour-là. */
  du_jour: boolean;
  termine: boolean;
  a_venir: boolean;
  valeur: number;
  atteint: boolean;
  serie: number;
  semaine: { atteints: number; total: number };
};

/**
 * Tous les défis de l'utilisateur et leur état pour `jour` (aujourd'hui par défaut) : valeur notée, cible atteinte,
 * série en cours, bilan de la semaine (lun.–dim.). Les défis en pause sont inclus (`actif: false`).
 */
export async function listerDefis(db: KvaliaClient, userId: string, jour = aujourdhuiIso()): Promise<EtatDefi[]> {
  const { data: defis, error } = await db.from("defis").select(COLONNES).eq("user_id", userId).order("created_at");
  if (error) throw error;
  if (!defis?.length) return [];
  const lundi = lundiDe(jour);
  const depuis = decalerJour(lundi, -370);
  const { data: suivi, error: errS } = await db
    .from("defis_suivi")
    .select("defi_id, jour, valeur")
    .eq("user_id", userId)
    .gte("jour", depuis)
    .lte("jour", decalerJour(lundi, 6));
  if (errS) throw errS;
  const parDefi = new Map<string, Map<string, number>>();
  for (const s of suivi ?? []) {
    if (!parDefi.has(s.defi_id)) parDefi.set(s.defi_id, new Map());
    parDefi.get(s.defi_id)!.set(s.jour, Number(s.valeur));
  }
  return (defis as LigneDefi[]).map((d) => {
    const mesure = mesureDe(d.mesure);
    const m = MESURES_DEFI[mesure];
    const valeurs = parDefi.get(d.id) ?? new Map<string, number>();
    const valeur = valeurs.get(jour) ?? 0;
    let total = 0;
    let atteints = 0;
    for (let i = 0; i < 7; i++) {
      const j = decalerJour(lundi, i);
      if (!defiValable({ ...d, actif: true }, j)) continue;
      total++;
      if ((valeurs.get(j) ?? 0) >= d.cible) atteints++;
    }
    return {
      id: d.id,
      nom: d.nom,
      mesure,
      cible: d.cible,
      unite: m.unite,
      icone: m.icone,
      increment: m.increment,
      jours_semaine: d.jours_semaine,
      libelle_jours: libelleJours(d.jours_semaine),
      debut: d.debut,
      fin: d.fin,
      actif: d.actif,
      du_jour: defiValable(d, jour),
      termine: !!d.fin && d.fin < jour,
      a_venir: d.debut > jour,
      valeur,
      atteint: valeur >= d.cible,
      serie: d.actif ? serieDefi(d, valeurs, jour) : 0,
      semaine: { atteints, total },
    };
  });
}

/** Fin par défaut d'un défi : la fin du programme actif (s'il en a une après `debut`), sinon pas de fin. */
async function programmeActif(db: KvaliaClient, userId: string): Promise<{ id: string; fin: string | null } | null> {
  const { data, error } = await db.from("programmes").select("id, fin").eq("user_id", userId).eq("actif", true).maybeSingle();
  if (error) throw error;
  return data;
}

/** Crée un défi. Cible par défaut selon la mesure ; tous les jours ; d'aujourd'hui à la fin du programme actif. */
export async function creerDefi(db: KvaliaClient, userId: string, entree: DefiEntree) {
  const e = DefiEntree.parse(entree);
  const debut = e.debut ?? aujourdhuiIso();
  const prog = await programmeActif(db, userId);
  const fin = e.fin !== undefined ? e.fin : prog?.fin && prog.fin >= debut ? prog.fin : null;
  if (fin && fin < debut) throw new Error("La fin du défi est avant son début.");
  const ligne = {
    user_id: userId,
    programme_id: prog?.id ?? null,
    nom: e.nom,
    mesure: e.mesure,
    cible: e.mesure === "case" ? 1 : (e.cible ?? MESURES_DEFI[e.mesure].cible),
    jours_semaine: [...new Set(e.jours_semaine ?? TOUS_LES_JOURS)].sort((a, b) => a - b),
    debut,
    fin,
  };
  const { data, error } = await db.from("defis").insert(ligne).select(COLONNES).single();
  if (error) throw error;
  return {
    id: data.id,
    nom: data.nom,
    mesure: mesureDe(data.mesure),
    cible: data.cible,
    jours_semaine: data.jours_semaine,
    libelle_jours: libelleJours(data.jours_semaine),
    debut: data.debut,
    fin: data.fin,
  };
}

/** Modifie un défi (nom, mesure, cible, jours, dates, pause). L'historique noté ne bouge pas. */
export async function modifierDefi(db: KvaliaClient, userId: string, entree: ModificationDefi) {
  const { id, ...m } = ModificationDefi.parse(entree);
  const { data: avant, error } = await db.from("defis").select(COLONNES).eq("id", id).eq("user_id", userId).single();
  if (error) throw error;
  const mesure = m.mesure ?? mesureDe(avant.mesure);
  const patch: TablesUpdate<"defis"> = { updated_at: new Date().toISOString() };
  if (m.nom !== undefined) patch.nom = m.nom;
  if (m.mesure !== undefined) patch.mesure = m.mesure;
  if (mesure === "case") patch.cible = 1;
  else if (m.cible !== undefined) patch.cible = m.cible;
  else if (m.mesure !== undefined && m.mesure !== avant.mesure) patch.cible = MESURES_DEFI[mesure].cible;
  if (m.jours_semaine !== undefined) patch.jours_semaine = [...new Set(m.jours_semaine)].sort((a, b) => a - b);
  if (m.debut !== undefined) patch.debut = m.debut;
  if (m.fin !== undefined) patch.fin = m.fin;
  if (m.actif !== undefined) patch.actif = m.actif;
  const debut = patch.debut ?? avant.debut;
  const fin = patch.fin !== undefined ? patch.fin : avant.fin;
  if (fin && fin < debut) throw new Error("La fin du défi est avant son début.");
  const { data, error: errMaj } = await db.from("defis").update(patch).eq("id", id).eq("user_id", userId).select(COLONNES).single();
  if (errMaj) throw errMaj;
  return {
    id: data.id,
    nom: data.nom,
    mesure: mesureDe(data.mesure),
    cible: data.cible,
    jours_semaine: data.jours_semaine,
    libelle_jours: libelleJours(data.jours_semaine),
    debut: data.debut,
    fin: data.fin,
    actif: data.actif,
  };
}

/** Supprime un défi et tout son suivi (irréversible : pour l'arrêter en gardant l'historique, modifier_defi actif=false). */
export async function supprimerDefi(db: KvaliaClient, userId: string, id: string) {
  const { data, error } = await db.from("defis").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  if (!data) return { id, supprime: false };
  const { error: errSuivi } = await db.from("defis_suivi").delete().eq("defi_id", id).eq("user_id", userId);
  if (errSuivi) throw errSuivi;
  const { error: errDel } = await db.from("defis").delete().eq("id", id).eq("user_id", userId);
  if (errDel) throw errDel;
  return { id, supprime: true };
}

/**
 * Note un défi pour un jour (aujourd'hui par défaut, jamais dans le futur) : `valeur` remplace, `ajouter` cumule,
 * `fait` coche (cible atteinte) ou décoche (0). Refusé un jour où le défi ne vaut pas.
 */
export async function noterDefi(db: KvaliaClient, userId: string, entree: NotationDefi) {
  const e = NotationDefi.parse(entree);
  const auj = aujourdhuiIso();
  const jour = e.jour ?? auj;
  if (jour > auj) throw new Error("On ne note pas un défi pour un jour à venir.");
  if (e.valeur === undefined && e.ajouter === undefined && e.fait === undefined) throw new Error("Rien à noter : donner valeur, ajouter ou fait.");
  const { data: d, error } = await db.from("defis").select(COLONNES).eq("id", e.defi_id).eq("user_id", userId).single();
  if (error) throw error;
  if (!defiValable({ ...d, actif: true }, jour)) throw new Error(`« ${d.nom} » ne vaut pas ce jour-là (${libelleJours(d.jours_semaine).toLowerCase()}).`);
  const { data: existant, error: errS } = await db.from("defis_suivi").select("id, valeur").eq("defi_id", d.id).eq("jour", jour).maybeSingle();
  if (errS) throw errS;
  const avant = Number(existant?.valeur ?? 0);
  let valeur = avant;
  if (e.fait !== undefined) valeur = e.fait ? Math.max(avant, d.cible) : 0;
  if (e.valeur !== undefined) valeur = e.valeur;
  if (e.ajouter !== undefined) valeur = avant + e.ajouter;
  valeur = Math.max(0, Math.round(valeur * 100) / 100);
  const maintenant = new Date().toISOString();
  const { error: errUp } = await db
    .from("defis_suivi")
    .upsert({ user_id: userId, defi_id: d.id, jour, valeur, updated_at: maintenant }, { onConflict: "defi_id,jour" });
  if (errUp) throw errUp;
  return { defi_id: d.id, nom: d.nom, jour, valeur, cible: d.cible, atteint: valeur >= d.cible };
}
