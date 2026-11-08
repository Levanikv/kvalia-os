/**
 * Sport — règles métier v1 : paramètres du programme, génération déterministe d'un bloc de N semaines
 * à partir de la bibliothèque d'exercices, suivi d'une séance (cocher, terminer) et calories (MET × poids × durée).
 *
 * L'agent (Claude) appelle ces fonctions via les outils MCP ; l'app via les server actions. Personne ne recode la règle.
 */
import { z } from "zod";
import type { KvaliaClient } from "./supabase";
import type { Tables } from "./database.types";

// ---------- Paramètres (profils.reglages.sport) ----------
export const ObjectifSport = z.enum(["hypertrophie", "force", "perte_de_gras", "endurance"]);
export const Niveau = z.enum(["beginner", "intermediate", "advanced"]);

export const ParametresSport = z.object({
  rythme: z
    .object({
      salle: z.number().int().min(0).max(6).default(4),
      boxe: z.number().int().min(0).max(3).default(1),
    })
    .default({ salle: 4, boxe: 1 }),
  /** Jours de la semaine (0 = dimanche … 6 = samedi). */
  jours_salle: z.array(z.number().int().min(0).max(6)).default([1, 2, 4, 5]),
  jours_boxe: z.array(z.number().int().min(0).max(6)).default([3]),
  duree_min: z.number().int().min(20).max(150).default(60),
  /** Matériel disponible — valeurs du référentiel (equipement). */
  materiel: z.array(z.string()).default(["barbell", "dumbbell", "cable", "leverage machine", "body weight", "ez barbell", "smith machine", "weighted"]),
  objectif: ObjectifSport.default("hypertrophie"),
  niveau: Niveau.default("intermediate"),
  semaines: z.number().int().min(4).max(24).default(12),
  /** Poids de secours si aucune pesée. */
  poids_kg: z.number().positive().optional(),
  effort_s_par_serie: z.number().int().default(40),
});
export type ParametresSport = z.infer<typeof ParametresSport>;
export const PARAMETRES_SPORT_DEFAUT: ParametresSport = ParametresSport.parse({});

export const MATERIEL_CONNU = [
  "barbell",
  "dumbbell",
  "cable",
  "leverage machine",
  "body weight",
  "ez barbell",
  "smith machine",
  "weighted",
  "band",
  "kettlebell",
  "stability ball",
  "rope",
  "sled machine",
] as const;

/** Libellés FR pour l'UI. */
export const LIBELLES = {
  materiel: {
    barbell: "Barre",
    dumbbell: "Haltères",
    cable: "Poulie",
    "leverage machine": "Machines guidées",
    "body weight": "Poids du corps",
    "ez barbell": "Barre EZ",
    "smith machine": "Smith machine",
    weighted: "Lesté",
    band: "Élastiques",
    kettlebell: "Kettlebell",
    "stability ball": "Swiss ball",
    rope: "Corde",
    "sled machine": "Presse / sled",
  } as Record<string, string>,
  partie: {
    chest: "Pectoraux",
    back: "Dos",
    shoulders: "Épaules",
    "upper arms": "Bras",
    "lower arms": "Avant-bras",
    "upper legs": "Cuisses",
    "lower legs": "Mollets",
    waist: "Abdos",
    hips: "Hanches",
    cardio: "Cardio",
  } as Record<string, string>,
  type: {
    upper: "Haut du corps",
    lower: "Bas du corps",
    push: "Push",
    pull: "Pull",
    legs: "Jambes",
    full: "Full body",
    boxe: "Boxe",
    hiit: "HIIT",
    maison: "Maison",
    cardio: "Cardio",
    repos: "Repos",
  } as Record<string, string>,
  objectif: { hypertrophie: "Prise de muscle", force: "Force", perte_de_gras: "Perte de gras", endurance: "Endurance" } as Record<string, string>,
  niveau: { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" } as Record<string, string>,
  focus: { hypertrophie: "Hypertrophie", force: "Force", mixte: "Mixte", deload: "Décharge" } as Record<string, string>,
};

// ---------- Calories ----------
export const MET_SEANCE: Record<string, number> = {
  boxe: 7.8,
  hiit: 8.0,
  cardio: 7.0,
  maison: 5.0,
  full: 5.5,
  upper: 5.0,
  lower: 5.5,
  push: 5.0,
  pull: 5.0,
  legs: 5.5,
};

/** kcal = MET × poids (kg) × durée (h). */
export function kcalPour(met: number, poidsKg: number, dureeS: number): number {
  return Math.round(met * poidsKg * (dureeS / 3600));
}

export async function poidsActuel(
  db: KvaliaClient,
  userId: string,
  params: ParametresSport,
): Promise<{ poids: number; source: "pesee" | "reglages" | "defaut" }> {
  const { data } = await db.from("pesees").select("poids_kg").eq("user_id", userId).order("jour", { ascending: false }).limit(1).maybeSingle();
  if (data) return { poids: Number(data.poids_kg), source: "pesee" };
  if (params.poids_kg) return { poids: params.poids_kg, source: "reglages" };
  return { poids: 80, source: "defaut" };
}

export async function parametresSport(db: KvaliaClient, userId: string): Promise<ParametresSport> {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const brut = (data?.reglages as Record<string, unknown> | null)?.sport ?? {};
  const r = ParametresSport.safeParse(brut);
  return r.success ? r.data : PARAMETRES_SPORT_DEFAUT;
}

export async function enregistrerParametresSport(db: KvaliaClient, userId: string, params: ParametresSport) {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const reglages = { ...((data?.reglages as Record<string, unknown>) ?? {}), sport: params };
  const { error } = await db.from("profils").update({ reglages }).eq("id", userId);
  if (error) throw error;
}

// ---------- Sélection d'exercices ----------
type Ref = Tables<"exercices_ref">;
type Slot = {
  nom: string;
  parties: string[];
  cibles: string[]; // sous-chaînes cherchées dans muscles (minuscule)
  compose?: boolean;
  prefere?: RegExp; // motif de nom à privilégier
  requis?: RegExp; // motif de nom obligatoire (évite les hors-sujet dans un créneau précis)
  exclure?: RegExp;
  isolation?: boolean; // pour le repos et l'ordre de coupe
};

const STRETCH = /stretch|pose|yoga|rotation|mobility|warm-up/i;

const S = {
  pecsCompose: { nom: "Pecs — composé", parties: ["chest"], cibles: ["pectorals"], compose: true, prefere: /bench press|press|dips|push-up/i } as Slot,
  pecsIncline: { nom: "Pecs — incliné", parties: ["chest"], cibles: ["pectorals"], compose: true, prefere: /incline/i } as Slot,
  pecsIso: {
    nom: "Pecs — isolation",
    parties: ["chest"],
    cibles: ["pectorals"],
    compose: false,
    requis: /fly|crossover|pec|pullover/i,
    prefere: /fly|crossover/i,
    isolation: true,
  } as Slot,
  dosHorizontal: {
    nom: "Dos — tirage horizontal",
    parties: ["back"],
    cibles: ["lats", "upper back", "rhomboids", "middle back"],
    compose: true,
    prefere: /row/i,
  } as Slot,
  dosVertical: {
    nom: "Dos — tirage vertical",
    parties: ["back"],
    cibles: ["lats"],
    compose: true,
    requis: /pulldown|pull-up|pull up|chin|pullover/i,
    prefere: /pulldown|pull-up/i,
  } as Slot,
  epaulesCompose: { nom: "Épaules — développé", parties: ["shoulders"], cibles: ["delts", "deltoid"], compose: true, prefere: /press/i } as Slot,
  epaulesLateral: {
    nom: "Épaules — élévations",
    parties: ["shoulders"],
    cibles: ["delts", "deltoid"],
    compose: false,
    requis: /lateral|upright/i,
    prefere: /lateral raise/i,
    isolation: true,
  } as Slot,
  arriereEpaules: {
    nom: "Arrière d'épaules",
    parties: ["shoulders", "back"],
    cibles: ["rear delt", "posterior deltoid", "delts", "upper back"],
    compose: false,
    requis: /rear|reverse|face pull|bent.?over lateral/i,
    prefere: /rear|reverse fly|face pull/i,
    isolation: true,
  } as Slot,
  biceps: {
    nom: "Biceps",
    parties: ["upper arms"],
    cibles: ["biceps"],
    requis: /curl/i,
    prefere: /barbell curl|dumbbell curl|hammer|incline/i,
    isolation: true,
  } as Slot,
  triceps: {
    nom: "Triceps",
    parties: ["upper arms"],
    cibles: ["triceps"],
    requis: /tricep|pushdown|extension|dip|close|skull|kickback|press.?down/i,
    prefere: /pushdown|extension|dip|close/i,
    isolation: true,
  } as Slot,
  quadsCompose: { nom: "Quadriceps — composé", parties: ["upper legs"], cibles: ["quad", "glutes"], compose: true, prefere: /squat|leg press|lunge/i } as Slot,
  quadsIso: {
    nom: "Quadriceps — isolation",
    parties: ["upper legs"],
    cibles: ["quad"],
    compose: false,
    requis: /extension|sissy|step/i,
    prefere: /leg extension/i,
    isolation: true,
  } as Slot,
  ischiosCompose: {
    nom: "Ischios / chaîne postérieure",
    parties: ["upper legs", "back", "hips"],
    cibles: ["hamstrings", "glutes", "erector"],
    compose: true,
    prefere: /deadlift|hip thrust|pull through|good morning|hyperextension/i,
  } as Slot,
  ischiosIso: {
    nom: "Ischios — isolation",
    parties: ["upper legs"],
    cibles: ["hamstrings"],
    compose: false,
    requis: /curl|nordic|glute.?ham/i,
    prefere: /leg curl/i,
    isolation: true,
  } as Slot,
  fessiers: { nom: "Fessiers", parties: ["upper legs", "hips", "back"], cibles: ["glute"], prefere: /hip thrust|glute bridge|kickback|lunge/i } as Slot,
  mollets: {
    nom: "Mollets",
    parties: ["lower legs"],
    cibles: ["calves", "gastrocnemius"],
    requis: /calf/i,
    prefere: /standing|seated|calf raise/i,
    isolation: true,
  } as Slot,
  abdos: {
    nom: "Abdos",
    parties: ["waist"],
    cibles: ["abs", "rectus abdominis", "abdominals"],
    prefere: /crunch|leg raise|plank|rollout/i,
    isolation: true,
  } as Slot,
  obliques: { nom: "Obliques / gainage", parties: ["waist"], cibles: ["obliques"], prefere: /twist|side|plank|woodchop/i, isolation: true } as Slot,
  trapezes: { nom: "Trapèzes", parties: ["back", "shoulders"], cibles: ["traps"], requis: /shrug|upright/i, prefere: /shrug/i, isolation: true } as Slot,
  cardioFin: { nom: "Finisher cardio", parties: ["cardio"], cibles: ["cardiovascular"], prefere: /burpee|jump rope|rope/i } as Slot,
};

type Modele = { type: string; titre: string; slots: Slot[] };
const MODELES: Record<string, Modele> = {
  upperA: { type: "upper", titre: "Haut du corps A", slots: [S.pecsCompose, S.dosHorizontal, S.epaulesCompose, S.dosVertical, S.pecsIso, S.triceps, S.biceps] },
  lowerA: { type: "lower", titre: "Bas du corps A", slots: [S.quadsCompose, S.ischiosCompose, S.quadsIso, S.ischiosIso, S.mollets, S.abdos] },
  upperB: {
    type: "upper",
    titre: "Haut du corps B",
    slots: [S.dosVertical, S.pecsIncline, S.dosHorizontal, S.epaulesLateral, S.arriereEpaules, S.biceps, S.triceps],
  },
  lowerB: { type: "lower", titre: "Bas du corps B", slots: [S.ischiosCompose, S.quadsCompose, S.fessiers, S.ischiosIso, S.mollets, S.obliques] },
  push: { type: "push", titre: "Push", slots: [S.pecsCompose, S.epaulesCompose, S.pecsIncline, S.pecsIso, S.epaulesLateral, S.triceps, S.triceps] },
  pull: { type: "pull", titre: "Pull", slots: [S.dosVertical, S.dosHorizontal, S.dosHorizontal, S.arriereEpaules, S.trapezes, S.biceps, S.biceps] },
  legs: { type: "legs", titre: "Jambes", slots: [S.quadsCompose, S.ischiosCompose, S.quadsIso, S.ischiosIso, S.fessiers, S.mollets, S.abdos] },
  full: { type: "full", titre: "Full body", slots: [S.quadsCompose, S.pecsCompose, S.dosHorizontal, S.ischiosCompose, S.epaulesCompose, S.abdos] },
};

/** Ordre des séances salle selon le nombre de jours. */
function splitPour(nbJours: number): string[] {
  if (nbJours <= 0) return [];
  if (nbJours === 1) return ["full"];
  if (nbJours === 2) return ["upperA", "lowerA"];
  if (nbJours === 3) return ["full", "full", "full"];
  if (nbJours === 4) return ["upperA", "lowerA", "upperB", "lowerB"];
  if (nbJours === 5) return ["push", "pull", "legs", "upperA", "lowerB"];
  return ["push", "pull", "legs", "push", "pull", "legs"];
}

const RANG_NIVEAU: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
/** Échauffement et transitions entre exercices, comptés dans la durée affichée (pas dans les kcal des exercices). */
const ECHAUFFEMENT_S = 8 * 60;
const TRANSITION_S = 75;

function choisir(refs: Ref[], slot: Slot, params: ParametresSport, dejaPris: Set<string>, graine: number): Ref | null {
  const niveauMax = RANG_NIVEAU[params.niveau] ?? 1;
  const cands = refs.filter((r) => {
    if (dejaPris.has(r.id)) return false;
    if (!r.equipement || !params.materiel.includes(r.equipement)) return false;
    if ((RANG_NIVEAU[r.difficulte ?? "beginner"] ?? 0) > niveauMax) return false;
    if (!r.partie_corps || !slot.parties.includes(r.partie_corps)) return false;
    if (STRETCH.test(r.nom) && !slot.parties.includes("cardio")) return false;
    if (slot.exclure && slot.exclure.test(r.nom)) return false;
    if (slot.requis && !slot.requis.test(r.nom)) return false;
    const muscles = [...(r.muscles ?? []), ...(r.muscles_secondaires ?? []).slice(0, 1)].map((m) => m.toLowerCase());
    if (!slot.cibles.some((c) => muscles.some((m) => m.includes(c)))) return false;
    if (slot.compose !== undefined && r.compose !== slot.compose) return false;
    return true;
  });
  if (cands.length === 0) return null;
  // score : motif préféré, matériel « sérieux » d'abord, difficulté proche du niveau
  const poidsMateriel: Record<string, number> = {
    barbell: 3,
    dumbbell: 3,
    cable: 2,
    "leverage machine": 2,
    "smith machine": 2,
    "ez barbell": 2,
    weighted: 2,
    "body weight": 1,
    band: 0,
    kettlebell: 1,
    "stability ball": 0,
    rope: 1,
    "sled machine": 2,
  };
  const score = (r: Ref) =>
    (slot.prefere?.test(r.nom) ? 10 : 0) +
    (poidsMateriel[r.equipement ?? ""] ?? 0) +
    (3 - Math.abs((RANG_NIVEAU[r.difficulte ?? "beginner"] ?? 0) - niveauMax)) -
    (r.unilateral && slot.compose ? 2 : 0);
  cands.sort((a, b) => score(b) - score(a) || a.nom.localeCompare(b.nom));
  // on tourne parmi les meilleurs pour varier d'un bloc à l'autre, sans tomber sur du médiocre
  const top = cands.slice(0, Math.min(4, cands.length));
  return top[graine % top.length];
}

// ---------- Progression ----------
type Prescription = { series: number; reps: string; repos_s: number; focus: string };

function prescription(params: ParametresSport, bloc: number, semaineDansBloc: number, slot: Slot): Prescription {
  const deload = semaineDansBloc === 4;
  const iso = slot.isolation === true;
  let focus: string;
  if (params.objectif === "force") focus = bloc === 1 ? "hypertrophie" : "force";
  else if (params.objectif === "endurance") focus = "mixte";
  else focus = bloc === 1 ? "hypertrophie" : bloc === 2 ? "force" : "mixte";
  if (deload) return { series: 2, reps: iso ? "12" : "8", repos_s: 60, focus: "deload" };
  const progression = semaineDansBloc === 3 ? 1 : 0; // semaine 3 : une série de plus
  if (params.objectif === "endurance") return { series: 3 + progression, reps: "15", repos_s: 45, focus };
  if (focus === "force")
    return iso ? { series: 3 + progression, reps: "8-10", repos_s: 60, focus } : { series: 4 + progression, reps: "5-6", repos_s: 120, focus };
  if (focus === "hypertrophie")
    return iso ? { series: 3 + progression, reps: "12-15", repos_s: 60, focus } : { series: 3 + progression, reps: "8-12", repos_s: 90, focus };
  return iso ? { series: 3, reps: "10-12", repos_s: 60, focus } : { series: 3 + progression, reps: "6-10", repos_s: 120, focus };
}

export type ProgrammeGenere = { programme_id: string; nb_seances: number; nb_exercices: number; debut: string; fin: string; avertissements: string[] };

/**
 * Génère un programme complet et le rend actif. L'ancien programme actif est désactivé et ses séances futures
 * non faites sont supprimées (les séances faites restent dans l'historique).
 */
export async function genererProgramme(db: KvaliaClient, userId: string, params: ParametresSport, debutIso?: string): Promise<ProgrammeGenere> {
  const avertissements: string[] = [];
  const { data: refsData, error: errRefs } = await db.from("exercices_ref").select("*");
  if (errRefs) throw errRefs;
  const refs = (refsData ?? []) as Ref[];
  if (refs.length === 0) throw new Error("Bibliothèque d'exercices vide : lance le seed (pnpm --filter @kvalia/agent seed:exercices).");

  // Début : lundi prochain par défaut (ou aujourd'hui si lundi)
  const debut = debutIso ? new Date(debutIso + "T12:00:00") : new Date();
  debut.setHours(12, 0, 0, 0);
  if (!debutIso) {
    const d = debut.getDay();
    const delta = d === 1 ? 0 : (8 - d) % 7;
    debut.setDate(debut.getDate() + delta);
  }
  const fin = new Date(debut);
  fin.setDate(fin.getDate() + params.semaines * 7 - 1);
  const iso = (x: Date) => x.toISOString().slice(0, 10);

  // Ancien programme actif
  const { data: anciens } = await db.from("programmes").select("id").eq("user_id", userId).eq("actif", true);
  for (const a of anciens ?? []) {
    await db.from("seances").delete().eq("programme_id", a.id).in("etat", ["prevue", "sautee"]).gte("jour", iso(new Date()));
    await db.from("programmes").update({ actif: false }).eq("id", a.id);
  }

  const { data: prog, error: errProg } = await db
    .from("programmes")
    .insert({
      user_id: userId,
      nom: `${LIBELLES.objectif[params.objectif]} — ${params.semaines} semaines`,
      debut: iso(debut),
      fin: iso(fin),
      rythme: {
        ...params.rythme,
        bloc_semaines: 4,
        jours_salle: params.jours_salle,
        jours_boxe: params.jours_boxe,
        objectif: params.objectif,
        niveau: params.niveau,
        duree_min: params.duree_min,
      },
      materiel: params.materiel,
      actif: true,
      genere_par: "kvalia-core",
    })
    .select("id")
    .single();
  if (errProg) throw errProg;

  const joursSalle = params.jours_salle.slice(0, params.rythme.salle).sort();
  const joursBoxe = params.jours_boxe
    .slice(0, params.rythme.boxe)
    .filter((j) => !joursSalle.includes(j))
    .sort();
  if (params.rythme.boxe > joursBoxe.length) avertissements.push("Un jour de boxe tombe sur un jour de salle : il a été ignoré.");
  const split = splitPour(joursSalle.length);

  const seancesAInserer: Array<Record<string, unknown>> = [];
  const exosParSeance: Array<Array<Record<string, unknown>>> = [];
  const { poids } = await poidsActuel(db, userId, params);

  for (let s = 0; s < params.semaines; s++) {
    const bloc = Math.floor(s / 4) + 1;
    const semaineDansBloc = (s % 4) + 1;
    const lundi = new Date(debut);
    lundi.setDate(debut.getDate() + s * 7);
    for (let j = 0; j < 7; j++) {
      const jourDate = new Date(lundi);
      jourDate.setDate(lundi.getDate() + j);
      const jds = jourDate.getDay();
      const idxSalle = joursSalle.indexOf(jds);
      if (idxSalle >= 0) {
        const modele = MODELES[split[idxSalle]];
        const pris = new Set<string>();
        const exos: Array<Record<string, unknown>> = [];
        let dureeTotale = 0;
        const slots = [...modele.slots];
        if (params.objectif === "perte_de_gras") slots.push(S.cardioFin);
        slots.forEach((slot, ordre) => {
          const ref = choisir(refs, slot, params, pris, (bloc - 1) * 2 + idxSalle + (slot.isolation ? s % 2 : 0));
          if (!ref) return;
          pris.add(ref.id);
          const p = prescription(params, bloc, semaineDansBloc, slot);
          const reps = slot === S.cardioFin ? "8 min" : p.reps;
          const series = slot === S.cardioFin ? 1 : p.series;
          const repos = slot === S.cardioFin ? 0 : p.repos_s;
          const dureeS = slot === S.cardioFin ? 480 : series * (params.effort_s_par_serie + repos);
          dureeTotale += dureeS;
          exos.push({ exercice_id: ref.id, ordre, series, reps, repos_s: repos, duree_s: dureeS, _met: Number(ref.met ?? 5), _iso: slot.isolation === true });
        });
        // Durée affichée = échauffement + exercices + transitions ; on coupe les isolations de la fin si on dépasse la cible (+10 %)
        const dureeSeance = () => ECHAUFFEMENT_S + dureeTotale + exos.length * TRANSITION_S;
        while (dureeSeance() > params.duree_min * 60 * 1.1 && exos.length > 4) {
          const idx = [...exos].reverse().findIndex((e) => e._iso);
          if (idx < 0) break;
          const retire = exos.splice(exos.length - 1 - idx, 1)[0];
          dureeTotale -= Number(retire.duree_s);
        }
        const p0 = prescription(params, bloc, semaineDansBloc, S.pecsCompose);
        seancesAInserer.push({
          user_id: userId,
          programme_id: prog.id,
          jour: iso(jourDate),
          type: modele.type,
          titre: modele.titre,
          duree_min: Math.round(dureeSeance() / 60),
          etat: "prevue",
          bloc,
          semaine: s + 1,
          focus: p0.focus,
        });
        exosParSeance.push(exos);
      } else if (joursBoxe.includes(jds)) {
        seancesAInserer.push({
          user_id: userId,
          programme_id: prog.id,
          jour: iso(jourDate),
          type: "boxe",
          titre: "Boxe — sac, shadow, corde",
          duree_min: params.duree_min,
          etat: "prevue",
          bloc,
          semaine: s + 1,
          focus: semaineDansBloc === 4 ? "deload" : "mixte",
          notes:
            semaineDansBloc === 4
              ? "Décharge : technique et déplacements, rounds légers."
              : "Échauffement corde 5 min · 8 rounds de 3 min (shadow puis sac) · 1 min de repos · gainage pour finir.",
        });
        exosParSeance.push([]);
      }
    }
  }

  const { data: seances, error: errSeances } = await db
    .from("seances")
    .insert(seancesAInserer as never)
    .select("id, jour, type");
  if (errSeances) throw errSeances;
  const lignes: Array<Record<string, unknown>> = [];
  (seances ?? []).forEach((se, i) => {
    for (const e of exosParSeance[i] ?? []) {
      const { _met, _iso, ...reste } = e;
      lignes.push({ ...reste, user_id: userId, seance_id: se.id, kcal: kcalPour(Number(_met), poids, Number(e.duree_s)) });
    }
  });
  for (let i = 0; i < lignes.length; i += 200) {
    const { error } = await db.from("exercices_seance").insert(lignes.slice(i, i + 200) as never);
    if (error) throw error;
  }
  return { programme_id: prog.id, nb_seances: seances?.length ?? 0, nb_exercices: lignes.length, debut: iso(debut), fin: iso(fin), avertissements };
}

// ---------- Suivi d'une séance ----------
export async function seanceDuJour(db: KvaliaClient, userId: string, jour: string) {
  const { data: seance, error } = await db
    .from("seances")
    .select("*, exercices_seance(*, exercices_ref!exercices_seance_exercice_id_fkey(id, nom, partie_corps, muscles, equipement, image_url, video_url, met))")
    .eq("user_id", userId)
    .eq("jour", jour)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!seance) return null;
  const exos = (seance.exercices_seance ?? []).sort((a, b) => a.ordre - b.ordre);
  return { ...seance, exercices_seance: exos };
}

async function recalculerSeance(db: KvaliaClient, seanceId: string) {
  const { data: exos } = await db.from("exercices_seance").select("fait, kcal").eq("seance_id", seanceId);
  const kcal = (exos ?? []).filter((e) => e.fait).reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  await db.from("seances").update({ kcal }).eq("id", seanceId);
  return kcal;
}

export async function cocherExercice(db: KvaliaClient, userId: string, exerciceSeanceId: string, fait: boolean) {
  const { data: exo, error } = await db
    .from("exercices_seance")
    .update({ fait, fait_le: fait ? new Date().toISOString() : null })
    .eq("id", exerciceSeanceId)
    .eq("user_id", userId)
    .select("seance_id")
    .single();
  if (error) throw error;
  // premier exercice coché = début de séance ; plus rien de coché = retour à « prévue »
  const { data: se } = await db.from("seances").select("debut_le, etat").eq("id", exo.seance_id).single();
  const kcal = await recalculerSeance(db, exo.seance_id);
  if (se && se.etat !== "faite") {
    const { count } = await db.from("exercices_seance").select("id", { count: "exact", head: true }).eq("seance_id", exo.seance_id).eq("fait", true);
    if ((count ?? 0) > 0 && !se.debut_le) await db.from("seances").update({ debut_le: new Date().toISOString(), etat: "en_cours" }).eq("id", exo.seance_id);
    else if ((count ?? 0) === 0 && se.etat === "en_cours") await db.from("seances").update({ debut_le: null, etat: "prevue" }).eq("id", exo.seance_id);
  }
  return { seance_id: exo.seance_id, kcal };
}

export async function terminerSeance(db: KvaliaClient, userId: string, seanceId: string, ressenti?: number, notes?: string) {
  const params = await parametresSport(db, userId);
  const { poids } = await poidsActuel(db, userId, params);
  const { data: se, error } = await db.from("seances").select("*, exercices_seance(id, fait, kcal, duree_s)").eq("id", seanceId).eq("user_id", userId).single();
  if (error) throw error;
  const exos = se.exercices_seance ?? [];
  const maintenant = new Date();
  // Durée réelle = depuis le premier exercice coché, si c'était il y a moins de 4 h (sinon la séance a été entamée un autre jour : on garde la durée prévue)
  const debut = se.debut_le ? new Date(se.debut_le) : null;
  const ecartMin = debut ? (maintenant.getTime() - debut.getTime()) / 60000 : null;
  const dureeReelleMin = ecartMin !== null && ecartMin <= 240 ? Math.max(5, Math.round(ecartMin)) : (se.duree_min ?? params.duree_min);
  let kcal: number;
  if (exos.length === 0) {
    // boxe / cardio : MET de la séance × durée réelle
    kcal = kcalPour(MET_SEANCE[se.type] ?? 5, poids, dureeReelleMin * 60);
  } else {
    // « terminer » sans tout cocher = tout est compté comme fait
    const nonFaits = exos.filter((e) => !e.fait).map((e) => e.id);
    if (nonFaits.length) await db.from("exercices_seance").update({ fait: true, fait_le: maintenant.toISOString() }).in("id", nonFaits);
    kcal = exos.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  }
  const { error: errMaj } = await db
    .from("seances")
    .update({
      etat: "faite",
      faite_le: maintenant.toISOString(),
      kcal,
      duree_min: dureeReelleMin,
      ressenti: ressenti ?? null,
      notes: notes ?? se.notes,
    })
    .eq("id", seanceId);
  if (errMaj) throw errMaj;
  return { seance_id: seanceId, kcal, duree_min: dureeReelleMin, poids_utilise: poids };
}

// ---------- Charges (kg) et historique par exercice ----------
export type Realise = { reps_faites?: number; note?: string };

/** Note la charge soulevée (et éventuellement les reps réalisées) sur un exercice d'une séance. */
export async function noterCharge(
  db: KvaliaClient,
  userId: string,
  exerciceSeanceId: string,
  maj: { charge_kg?: number | null; reps_faites?: number | null; note?: string | null },
) {
  const { data: ligne, error } = await db
    .from("exercices_seance")
    .select("id, realise, exercice_id, seance_id")
    .eq("id", exerciceSeanceId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const realise: Realise = { ...((ligne.realise as Realise | null) ?? {}) };
  if (maj.reps_faites !== undefined) {
    if (maj.reps_faites === null) delete realise.reps_faites;
    else realise.reps_faites = maj.reps_faites;
  }
  if (maj.note !== undefined) {
    if (maj.note === null || maj.note === "") delete realise.note;
    else realise.note = maj.note;
  }
  const patch: { realise: Realise; charge_kg?: number | null } = { realise };
  if (maj.charge_kg !== undefined) patch.charge_kg = maj.charge_kg;
  const { error: errMaj } = await db.from("exercices_seance").update(patch).eq("id", exerciceSeanceId);
  if (errMaj) throw errMaj;
  return { id: ligne.id, exercice_id: ligne.exercice_id, seance_id: ligne.seance_id, charge_kg: maj.charge_kg ?? null, realise };
}

/** Les charges notées sur un exercice, de la plus récente à la plus ancienne (pour la fiche et les graphes). */
export async function historiqueCharge(db: KvaliaClient, userId: string, exerciceId: string, limite = 12) {
  const { data, error } = await db
    .from("exercices_seance")
    .select("id, charge_kg, series, reps, fait, realise, seance_id, seances!inner(jour, etat, titre)")
    .eq("user_id", userId)
    .eq("exercice_id", exerciceId)
    .not("charge_kg", "is", null);
  if (error) throw error;
  type L = { jour: string; etat: string; titre: string | null };
  return (data ?? [])
    .map((x) => ({
      id: x.id,
      seance_id: x.seance_id,
      charge_kg: Number(x.charge_kg),
      series: x.series,
      reps: x.reps,
      fait: x.fait,
      reps_faites: (x.realise as Realise | null)?.reps_faites ?? null,
      jour: (x.seances as unknown as L).jour,
      titre: (x.seances as unknown as L).titre,
    }))
    .sort((a, b) => (a.jour < b.jour ? 1 : -1))
    .slice(0, limite);
}

/** Dernière charge notée pour chaque exercice d'une liste (pré-remplissage de la séance). */
export async function dernieresCharges(db: KvaliaClient, userId: string, exerciceIds: string[], avantSeanceId?: string) {
  if (exerciceIds.length === 0) return {} as Record<string, { charge_kg: number; jour: string }>;
  const { data } = await db
    .from("exercices_seance")
    .select("exercice_id, charge_kg, seance_id, seances!inner(jour)")
    .eq("user_id", userId)
    .in("exercice_id", exerciceIds)
    .not("charge_kg", "is", null);
  const res: Record<string, { charge_kg: number; jour: string }> = {};
  for (const x of data ?? []) {
    if (avantSeanceId && x.seance_id === avantSeanceId) continue;
    const jour = (x.seances as unknown as { jour: string }).jour;
    if (!res[x.exercice_id] || res[x.exercice_id].jour < jour) res[x.exercice_id] = { charge_kg: Number(x.charge_kg), jour };
  }
  return res;
}

// ---------- Remplacer un exercice ----------
export type Equivalent = Pick<
  Ref,
  "id" | "nom" | "nom_fr" | "partie_corps" | "muscles" | "muscles_secondaires" | "equipement" | "difficulte" | "compose" | "image_url"
> & { score: number; raison: string };

/**
 * Propose des exercices équivalents : même partie du corps et muscles proches, matériel disponible,
 * en privilégiant même nature (polyarticulaire ou non) et niveau. `exclure` = déjà dans la séance.
 */
export async function equivalents(db: KvaliaClient, exerciceId: string, materiel: string[], exclure: string[] = [], limite = 8): Promise<Equivalent[]> {
  const { data: orig, error } = await db.from("exercices_ref").select("*").eq("id", exerciceId).single();
  if (error) throw error;
  const cible = (orig.muscles[0] ?? "").toLowerCase();
  const famille = new Set([...orig.muscles, ...orig.muscles_secondaires].map((m) => m.toLowerCase()));
  const { data: cands } = await db
    .from("exercices_ref")
    .select("id, nom, nom_fr, partie_corps, muscles, muscles_secondaires, equipement, difficulte, compose, image_url")
    .neq("id", exerciceId)
    .in("equipement", materiel.length ? materiel : (MATERIEL_CONNU as unknown as string[]));
  const interdits = new Set(exclure);
  const out: Equivalent[] = [];
  for (const c of cands ?? []) {
    if (interdits.has(c.id) || STRETCH.test(c.nom)) continue;
    const m = c.muscles.map((x) => x.toLowerCase());
    const s = c.muscles_secondaires.map((x) => x.toLowerCase());
    let score = 0;
    const raisons: string[] = [];
    if (cible && m.some((x) => x.includes(cible) || cible.includes(x))) {
      score += 6;
      raisons.push("même muscle cible");
    } else if (cible && s.some((x) => x.includes(cible))) {
      score += 3;
      raisons.push("muscle cible en secondaire");
    } else continue; // sans muscle commun, ce n'est pas un équivalent
    if (c.partie_corps !== orig.partie_corps && score < 6) continue;
    score += Math.min([...m, ...s].filter((x) => famille.has(x)).length, 3);
    if (c.partie_corps === orig.partie_corps) score += 1;
    if (c.compose === orig.compose) {
      score += 2;
      raisons.push(orig.compose ? "polyarticulaire" : "isolation");
    } else score -= 1;
    if (c.equipement === orig.equipement) score += 1;
    else raisons.push(LIBELLES.materiel[c.equipement ?? ""] ?? c.equipement ?? "");
    score -= Math.abs((RANG_NIVEAU[c.difficulte ?? "beginner"] ?? 0) - (RANG_NIVEAU[orig.difficulte ?? "beginner"] ?? 0));
    if (score >= 5) out.push({ ...c, score, raison: raisons.filter(Boolean).join(" · ") });
  }
  out.sort((a, b) => b.score - a.score || a.nom.localeCompare(b.nom));
  return out.slice(0, limite);
}

export type PorteeRemplacement = "seance" | "programme";

/**
 * Remplace un exercice par un autre : dans cette séance seulement, ou dans toutes les séances à venir du
 * programme qui contiennent le même exercice (non faites). Les kcal sont recalculées avec le MET du nouvel exercice.
 */
export async function remplacerExercice(db: KvaliaClient, userId: string, exerciceSeanceId: string, nouvelExerciceId: string, portee: PorteeRemplacement) {
  const { data: ligne, error } = await db
    .from("exercices_seance")
    .select("id, exercice_id, substitut_de, seance_id, duree_s, seances!inner(jour, programme_id)")
    .eq("id", exerciceSeanceId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const { data: nouveau, error: errRef } = await db.from("exercices_ref").select("id, nom, met").eq("id", nouvelExerciceId).single();
  if (errRef) throw errRef;
  const params = await parametresSport(db, userId);
  const { poids } = await poidsActuel(db, userId, params);
  const ancien = ligne.exercice_id;
  const origine = ligne.substitut_de ?? ancien;
  const se = ligne.seances as unknown as { jour: string; programme_id: string | null };

  let ids: Array<{ id: string; duree_s: number | null }> = [{ id: ligne.id, duree_s: ligne.duree_s }];
  if (portee === "programme" && se.programme_id) {
    const { data: autres } = await db
      .from("exercices_seance")
      .select("id, duree_s, fait, seances!inner(jour, programme_id, etat)")
      .eq("user_id", userId)
      .eq("exercice_id", ancien)
      .eq("fait", false)
      .eq("seances.programme_id", se.programme_id)
      .gte("seances.jour", se.jour);
    ids = (autres ?? []).map((a) => ({ id: a.id, duree_s: a.duree_s }));
    if (!ids.some((x) => x.id === ligne.id)) ids.push({ id: ligne.id, duree_s: ligne.duree_s });
  }
  for (const x of ids) {
    const { error: errMaj } = await db
      .from("exercices_seance")
      .update({
        exercice_id: nouveau.id,
        substitut_de: origine === nouveau.id ? null : origine,
        kcal: kcalPour(Number(nouveau.met ?? 5), poids, Number(x.duree_s ?? 0)),
        charge_kg: null,
      })
      .eq("id", x.id);
    if (errMaj) throw errMaj;
  }
  return { remplaces: ids.length, ancien, nouveau: nouveau.id, nom: nouveau.nom, portee };
}
