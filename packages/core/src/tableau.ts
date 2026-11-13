/**
 * Tableau de bord Sport (Home Sport) — tout ce que la vue Jour affiche autour de la séance, calculé ici
 * pour que l'app et l'agent disent la même chose :
 * progression (XP, niveau), objectif de la semaine, série de semaines complètes, rang de la séance,
 * records du programme, conseil du coach, corps (poids, volume de la semaine).
 */
import type { KvaliaClient } from "./supabase";

// ---------- Progression ----------
/** 100 XP par séance faite. */
export const XP_PAR_SEANCE = 100;
export const NOMS_NIVEAUX = ["Recrue", "Régulier", "Solide", "Costaud", "Bloc", "Machine", "Titan", "Colosse", "Légende"] as const;

/** XP cumulée pour atteindre le niveau n (n ≥ 1) : 250 × n × (n − 1) / 2 → 0, 250, 750, 1 500, 2 500, 3 750, 5 250… */
export function seuilNiveau(n: number): number {
  return (250 * n * (n - 1)) / 2;
}

export function niveauPour(xp: number): { niveau: number; nom: string; xp: number; xp_restant: number; prochain: number } {
  let n = 1;
  while (xp >= seuilNiveau(n + 1)) n++;
  return { niveau: n, nom: NOMS_NIVEAUX[Math.min(n, NOMS_NIVEAUX.length) - 1], xp, xp_restant: seuilNiveau(n + 1) - xp, prochain: n + 1 };
}

// ---------- Dates (jours calendaires ISO, sans fuseau) ----------
function decaler(jour: string, n: number): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** Lundi de la semaine d'un jour. */
export function lundiDe(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  return decaler(jour, -((d.getUTCDay() + 6) % 7));
}

// ---------- Volume ----------
/** Premier entier d'une prescription de reps (« 8 », « 8-10 », « 12 / jambe ») ; 0 si aucune. */
export function repsNombre(reps: string | null | undefined): number {
  const m = /\d+/.exec(reps ?? "");
  return m ? Number(m[0]) : 0;
}
/** Tonnage d'un exercice fait : charge × séries × reps (reps réalisées si notées). */
export function tonnageExercice(e: { charge_kg: number | null; series: number; reps: string; realise?: unknown }): number {
  if (!e.charge_kg) return 0;
  const faites = (e.realise as { reps_faites?: number } | null)?.reps_faites;
  return Number(e.charge_kg) * e.series * (faites ?? repsNombre(e.reps));
}
const PALIERS_T = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000];
/** Prochain badge de tonnage cumulé (en tonnes). */
export function prochainPalier(tonnes: number): number {
  return PALIERS_T.find((p) => p > tonnes) ?? Math.ceil((tonnes + 1) / 1000) * 1000;
}

// ---------- Tableau ----------
type SeanceLigne = { id: string; jour: string; type: string; etat: string; programme_id: string | null; created_at?: string | null };
type ExoLigne = {
  seance_id: string;
  exercice_id: string;
  charge_kg: number | null;
  series: number;
  reps: string;
  realise: unknown;
  fait: boolean;
  exercices_ref?: { nom: string; nom_fr: string | null } | null;
};

export type Record_ = {
  exercice_id: string;
  nom: string;
  nom_fr: string | null;
  charge_kg: number;
  progression_kg: number;
  semaines: number;
  /** Charge max par semaine (du plus ancien au plus récent), pour la courbe. */
  serie: number[];
};

export type TableauSport = {
  jour: string;
  progression: ReturnType<typeof niveauPour>;
  semaine: {
    debut: string;
    fin: string;
    prevues: number;
    faites: number;
    restantes: number;
    xp_a_gagner: number;
    tonnage_kg: number;
    tonnage_precedente_kg: number;
  };
  serie_semaines: number;
  /** Rang de la séance du jour dans le programme (« 13/40 »). */
  rang: { seance_id: string; rang: number; total: number } | null;
  records: Record_[];
  coach: { message: string; detail: string };
  poids: { actuel: number | null; serie: number[] };
  tonnage_total_t: number;
};

const estSalle = (s: { type: string }) => s.type !== "repos" && s.type !== "boxe";

/**
 * Calcule le tableau de la vue Jour. Lit les séances (toutes), les exercices des séances du programme actif,
 * les pesées. `semaineProgramme` (1…N) alimente le conseil du coach (fin de bloc, décharge).
 */
export async function tableauSport(db: KvaliaClient, userId: string, jour: string, opts: { semaineProgramme?: number | null } = {}): Promise<TableauSport> {
  const [{ data: seancesBrutes, error: e1 }, { data: programme }, { data: pesees }] = await Promise.all([
    db.from("seances").select("id, jour, type, etat, programme_id, created_at").eq("user_id", userId).order("jour"),
    db.from("programmes").select("id, debut").eq("user_id", userId).eq("actif", true).maybeSingle(),
    db.from("pesees").select("jour, poids_kg").eq("user_id", userId).order("jour", { ascending: false }).limit(8),
  ]);
  if (e1) throw e1;
  const seances = ((seancesBrutes ?? []) as SeanceLigne[]).filter(estSalle);
  const faites = seances.filter((s) => s.etat === "faite");

  // Progression
  const progression = niveauPour(faites.length * XP_PAR_SEANCE);

  // Semaine en cours
  const debut = lundiDe(jour);
  const fin = decaler(debut, 6);
  const dansSemaine = (s: SeanceLigne, l: string) => s.jour >= l && s.jour <= decaler(l, 6);
  const sem = seances.filter((s) => dansSemaine(s, debut));
  const faitesSem = sem.filter((s) => s.etat === "faite").length;

  // Série : semaines complètes d'affilée (la semaine en cours compte si elle est déjà complète)
  let serie = 0;
  const complete = (l: string) => {
    const ss = seances.filter((s) => dansSemaine(s, l));
    return ss.length > 0 && ss.every((s) => s.etat === "faite");
  };
  if (complete(debut)) serie++;
  for (let l = decaler(debut, -7); complete(l); l = decaler(l, -7)) serie++;

  // Rang de la séance du jour dans son programme
  const duJour = seances.find((s) => s.jour === jour && s.programme_id);
  let rang: TableauSport["rang"] = null;
  if (duJour) {
    const duProg = seances.filter((s) => s.programme_id === duJour.programme_id);
    rang = { seance_id: duJour.id, rang: duProg.findIndex((s) => s.id === duJour.id) + 1, total: duProg.length };
  }

  // Exercices des séances faites (programme actif) : records, tonnage
  const idsFaites = faites.map((s) => s.id);
  let exos: ExoLigne[] = [];
  if (idsFaites.length) {
    const { data, error } = await db
      .from("exercices_seance")
      .select("seance_id, exercice_id, charge_kg, series, reps, realise, fait, exercices_ref!exercices_seance_exercice_id_fkey(nom, nom_fr)")
      .eq("user_id", userId)
      .in("seance_id", idsFaites);
    if (error) throw error;
    exos = (data ?? []) as unknown as ExoLigne[];
  }
  const jourDe = new Map(faites.map((s) => [s.id, s.jour]));
  const tonnageEntre = (a: string, b: string) =>
    exos.filter((e) => e.fait && (jourDe.get(e.seance_id) ?? "") >= a && (jourDe.get(e.seance_id) ?? "") <= b).reduce((t, e) => t + tonnageExercice(e), 0);
  const tonnageTotal = exos.filter((e) => e.fait).reduce((t, e) => t + tonnageExercice(e), 0);

  const debutProg = programme?.debut ?? null;
  const parExo = new Map<string, Array<{ jour: string; charge: number; ref: ExoLigne["exercices_ref"] }>>();
  for (const e of exos) {
    const j = jourDe.get(e.seance_id);
    if (!j || !e.charge_kg || (debutProg && j < debutProg)) continue;
    const l = parExo.get(e.exercice_id) ?? [];
    l.push({ jour: j, charge: Number(e.charge_kg), ref: e.exercices_ref });
    parExo.set(e.exercice_id, l);
  }
  const records: Record_[] = [...parExo.entries()]
    .map(([exercice_id, l]) => {
      l.sort((a, b) => a.jour.localeCompare(b.jour));
      const parSemaine = new Map<string, number>();
      for (const x of l) parSemaine.set(lundiDe(x.jour), Math.max(parSemaine.get(lundiDe(x.jour)) ?? 0, x.charge));
      const serieKg = [...parSemaine.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
      const max = Math.max(...l.map((x) => x.charge));
      const semaines = Math.max(1, Math.round((new Date(l[l.length - 1].jour).getTime() - new Date(l[0].jour).getTime()) / (7 * 86400000)) + 1);
      return {
        exercice_id,
        nom: l[0].ref?.nom ?? "",
        nom_fr: l[0].ref?.nom_fr ?? null,
        charge_kg: max,
        progression_kg: Math.round((max - l[0].charge) * 10) / 10,
        semaines,
        serie: serieKg.slice(-8),
        nb: l.length,
      };
    })
    .sort((a, b) => b.nb - a.nb || b.charge_kg - a.charge_kg)
    .slice(0, 3)
    .map(({ nb: _nb, ...r }) => r);

  // Coach : un conseil déterministe selon la position dans le bloc de 4 semaines
  const s =
    opts.semaineProgramme ??
    (debutProg && jour >= debutProg
      ? Math.floor((new Date(`${jour}T12:00:00Z`).getTime() - new Date(`${debutProg}T12:00:00Z`).getTime()) / (7 * 86400000)) + 1
      : null);
  const tete = records[0];
  const nomTete = tete ? (tete.nom_fr ?? tete.nom) : null;
  let message: string;
  if (s && s % 4 === 0) message = "Semaine de décharge : charges −10 %, technique propre, on recharge pour le bloc suivant.";
  else if (s && s % 4 === 3 && tete)
    message = `Dernière semaine du bloc. Tiens ${String(tete.charge_kg).replace(".", ",")} kg au ${nomTete} sur toutes les séries.`;
  else if (faitesSem === 0 && sem.length > 0) message = "Première séance de la semaine : lance le rythme, le reste suit.";
  else if (sem.length > 0 && faitesSem >= sem.length) message = "Semaine bouclée. Sommeil et protéines : c’est maintenant que ça pousse.";
  else message = "Toutes les reps passent ? Ajoute 2,5 kg à la prochaine séance.";
  const tonnes = tonnageTotal / 1000;
  const detail = `Coach · prochain badge à ${prochainPalier(tonnes).toLocaleString("fr-FR")} t soulevées`;

  return {
    jour,
    progression,
    semaine: {
      debut,
      fin,
      prevues: sem.length,
      faites: faitesSem,
      restantes: Math.max(0, sem.length - faitesSem),
      xp_a_gagner: Math.max(0, sem.length - faitesSem) * XP_PAR_SEANCE,
      tonnage_kg: Math.round(tonnageEntre(debut, fin)),
      tonnage_precedente_kg: Math.round(tonnageEntre(decaler(debut, -7), decaler(debut, -1))),
    },
    serie_semaines: serie,
    rang,
    records,
    coach: { message, detail },
    poids: { actuel: pesees?.[0] ? Number(pesees[0].poids_kg) : null, serie: (pesees ?? []).map((p) => Number(p.poids_kg)).reverse() },
    tonnage_total_t: Math.round(tonnes * 10) / 10,
  };
}
