import { LIBELLES, trierSeancesDuJour } from "@kvalia/core";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@kvalia/core";
import type { MarqueJour } from "@/components/BandeJours";

type Db = SupabaseClient<Database>;

export const SELECT_SEANCE =
  "*, exercices_seance(*, exercices_ref!exercices_seance_exercice_id_fkey(id, nom, nom_fr, partie_corps, muscles, equipement, image_url, video_url, difficulte))";

export type SeanceComplete = NonNullable<Awaited<ReturnType<typeof chargerSeance>>>;
export type ExoSeance = SeanceComplete["exercices_seance"][number];

export async function chargerSeance(db: Db, id: string) {
  const { data } = await db.from("seances").select(SELECT_SEANCE).eq("id", id).maybeSingle();
  if (!data) return null;
  return { ...data, exercices_seance: [...data.exercices_seance].sort((a, b) => a.ordre - b.ordre) };
}

/** Toutes les séances d'un jour (salle avant boxe), exercices triés. Lecture d'affichage pure. */
export async function seancesPourJour(db: Db, jour: string) {
  const { data } = await db.from("seances").select(SELECT_SEANCE).eq("jour", jour).order("created_at");
  return trierSeancesDuJour(data ?? []).map((s) => ({ ...s, exercices_seance: [...s.exercices_seance].sort((a, b) => a.ordre - b.ordre) }));
}

export function decaler(jour: string, jours: number): string {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/** Jour valide depuis `?jour=` sinon aujourd'hui. */
export function jourDepuis(param: string | undefined, auj: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(param ?? "") ? param! : auj;
}

/** Marques de la bande de jours autour d'un jour (séances prévues / faites). */
export async function marquesAutour(db: Db, jour: string, rayon = 21): Promise<Record<string, MarqueJour[]>> {
  const { data } = await db
    .from("seances")
    .select("jour, type, etat, created_at")
    .gte("jour", decaler(jour, -rayon))
    .lte("jour", decaler(jour, rayon))
    .order("created_at");
  const m: Record<string, MarqueJour[]> = {};
  for (const s of trierSeancesDuJour(data ?? [])) (m[s.jour] ??= []).push({ type: s.type, etat: s.etat });
  return m;
}

/** Séances de plusieurs jours : par jour, puis salle avant boxe (même règle que core). */
export function trierParJour<T extends { jour: string; type: string; created_at?: string | null }>(seances: T[]): T[] {
  const rang = (t: string) => (t === "boxe" ? 1 : 0);
  return [...seances].sort(
    (a, b) => a.jour.localeCompare(b.jour) || rang(a.type) - rang(b.type) || String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
  );
}

/** « Aujourd'hui », « Demain », « Il y a 3 jours »… : l'indicateur du jour sélectionné dans l'en-tête. */
export function jourRelatif(jour: string, auj: string): string {
  const n = Math.round((new Date(jour + "T12:00:00Z").getTime() - new Date(auj + "T12:00:00Z").getTime()) / 86400000);
  if (n === 0) return "Aujourd’hui";
  if (n === 1) return "Demain";
  if (n === -1) return "Hier";
  return n > 0 ? `Dans ${n} jours` : `Il y a ${-n} jours`;
}

export type Programme = { id: string; nom: string; debut: string; fin: string | null; rythme: unknown };

/** Position d'un jour dans le programme : semaine n / total, bloc. */
export function positionProgramme(prog: Programme | null, jour: string) {
  if (!prog) return null;
  const ms = 86400000;
  const total = prog.fin ? Math.round((new Date(prog.fin).getTime() - new Date(prog.debut).getTime() + ms) / (7 * ms)) : null;
  const delta = Math.floor((new Date(jour).getTime() - new Date(prog.debut).getTime()) / (7 * ms)) + 1;
  if (delta < 1) return { avant: true, semaine: 0, total, bloc: 0, debut: prog.debut };
  if (total && delta > total) return { apres: true, semaine: total, total, bloc: Math.ceil(total / 4), debut: prog.debut };
  return { semaine: delta, total, bloc: Math.ceil(delta / 4), debut: prog.debut };
}

export function libelleType(type: string) {
  return LIBELLES.type[type] ?? type;
}
export function libelleFocus(focus: string | null) {
  return focus ? (LIBELLES.focus[focus] ?? focus) : null;
}
export function libellePartie(p: string | null) {
  return p ? (LIBELLES.partie[p] ?? p) : "";
}
export function libelleMateriel(m: string | null) {
  return m ? (LIBELLES.materiel[m] ?? m) : "";
}

/** « 0:42 », « 38:40 », « 1:02:14 » : chrono de séance, décompte de repos. */
export function formatChrono(totalS: number): string {
  const s = Math.max(0, Math.floor(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

export function dateCourte(jour: string) {
  return new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}
export function dateLongue(jour: string) {
  const s = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function kcalPrevues(s: { exercices_seance: Array<{ kcal: number | null }>; type: string; duree_min: number | null }, poids: number) {
  if (s.exercices_seance.length > 0) return s.exercices_seance.reduce((a, e) => a + Number(e.kcal ?? 0), 0);
  const met: Record<string, number> = { boxe: 7.8, hiit: 8, cardio: 7, maison: 5 };
  return Math.round((met[s.type] ?? 5) * poids * ((s.duree_min ?? 60) / 60));
}

/**
 * Nom affiché : `nom_fr` si renseigné, sinon traduction heuristique du nom anglais du référentiel.
 * Le matériel (Barbell, Dumbbell…) est retiré du nom — il est affiché à part (chip). Les modificateurs
 * (assis, incliné, un bras…) passent après le mouvement, à la française.
 */
export function nomAffiche(e: { nom: string; nom_fr?: string | null }): string {
  if (e.nom_fr) return e.nom_fr;
  let n = " " + e.nom.replace(/\(.*?\)/g, " ") + " ";
  n = n.replace(/\b(Barbells?|Dumbbells?|Cables?|Lever|Smith( Machine)?|Weighted|Bands?|Kettlebells?|EZ|Single Dumbbell|Body ?weight|Machine)\b/gi, " ");
  // Cas particuliers avant la découpe
  n = n.replace(/\bRear (Lateral Raise|Delt Fly|Fly)\b/i, " Oiseau ").replace(/\bReverse Fly\b/i, " Oiseau ");
  const modifs: Array<[RegExp, string]> = [
    [/\bStiff[- ]Leg(ged)?\b/i, "jambes tendues"],
    [/\bStraight Leg\b/i, "jambes tendues"],
    [/\bRomanian\b/i, "roumain"],
    [/\bSumo\b/i, "sumo"],
    [/\bClose[- ]Grip\b/i, "prise serrée"],
    [/\bWide[- ]Grip\b/i, "prise large"],
    [/\bHammer Grip\b/i, "prise marteau"],
    [/\bUnderhand\b/i, "supination"],
    [/\bOverhand\b/i, "pronation"],
    [/\bNeutral Grip\b/i, "prise neutre"],
    [/\bReverse Grip\b/i, "prise inversée"],
    [/\bOne[- ]Arm\b/i, "un bras"],
    [/\bSingle[- ]Arm\b/i, "un bras"],
    [/\bSingle[- ]Leg\b/i, "une jambe"],
    [/\bOne[- ]Leg\b/i, "une jambe"],
    [/\bAlternating\b/i, "alterné"],
    [/\bSeated\b/i, "assis"],
    [/\bStanding\b/i, "debout"],
    [/\bLying\b/i, "allongé"],
    [/\bKneeling\b/i, "à genoux"],
    [/\bProne\b/i, "sur banc"],
    [/\bBent[- ]Over\b/i, "buste penché"],
    [/\bIncline\b/i, "incliné"],
    [/\bDecline\b/i, "décliné"],
    [/\b45[- ]Degree\b/i, "à 45°"],
    [/\bOn (Exercise|Stability|Swiss) Ball\b/i, "sur swiss ball"],
    [/\bOverhead\b/i, "au-dessus de la tête"],
    [/\bBehind The Neck\b/i, "nuque"],
    [/\bRear\b/i, "arrière"],
    [/\bFront\b/i, "avant"],
    [/\bSide\b/i, "latéral"],
    [/\bReverse\b/i, "inversé"],
    [/\bWeighted\b/i, "lesté"],
    [/\bAssisted\b/i, "assisté"],
    [/\bJump(ing)?\b/i, "sauté"],
    [/\bTwisting\b/i, "croisé"],
  ];
  const suffixes: string[] = [];
  for (const [re, fr] of modifs)
    if (re.test(n)) {
      n = n.replace(re, " ");
      suffixes.push(fr);
    }
  const dico: Array<[RegExp, string]> = [
    [/\bBench Press\b/i, "Développé couché"],
    [/\bChest Press\b/i, "Développé poitrine"],
    [/\bArnold Press\b/i, "Développé Arnold"],
    [/\bShoulder Press\b/i, "Développé épaules"],
    [/\bMilitary Press\b/i, "Développé militaire"],
    [/\bPush Press\b/i, "Push press"],
    [/\bFloor Press\b/i, "Développé au sol"],
    [/\bHammer Press\b/i, "Développé prise marteau"],
    [/\bSquat\b/i, "Squat"],
    [/\bGoblet\b/i, "goblet"],
    [/\bSplit\b/i, "bulgare"],
    [/\bHack\b/i, "hack"],
    [/\bDeadlift\b/i, "Soulevé de terre"],
    [/\bUpright Row\b/i, "Rowing menton"],
    [/\bBench Row\b/i, "Rowing sur banc"],
    [/\bRow\b/i, "Rowing"],
    [/\bStraight Arm Pulldown\b/i, "Tirage bras tendus"],
    [/\bLat Pulldown\b/i, "Tirage vertical"],
    [/\bLateral Pulldown\b/i, "Tirage vertical"],
    [/\bPulldown\b/i, "Tirage vertical"],
    [/\bPull[- ]?ups?\b/i, "Tractions"],
    [/\bChin[- ]?ups?\b/i, "Tractions supination"],
    [/\bPullover\b/i, "Pullover"],
    [/\bLateral Raise\b/i, "Élévations latérales"],
    [/\bFly\b/i, "Écarté"],
    [/\bCrossover\b/i, "Crossover"],
    [/\bFace Pull\b/i, "Face pull"],
    [/\bShrugs?\b/i, "Haussements d’épaules"],
    [/\bHammer Curl\b/i, "Curl marteau"],
    [/\bPreacher Curl\b/i, "Curl pupitre"],
    [/\bConcentration Curl\b/i, "Curl concentré"],
    [/\bDrag Curl\b/i, "Drag curl"],
    [/\bZottman\b/i, "Zottman"],
    [/\bBiceps Curl\b/i, "Curl biceps"],
    [/\bLeg Curl\b/i, "Leg curl"],
    [/\bWrist Curl\b/i, "Curl poignets"],
    [/\bTriceps Extension\b/i, "Extension triceps"],
    [/\bTriceps Pushdown\b/i, "Extension triceps poulie"],
    [/\bPushdown\b/i, "Extension poulie"],
    [/\bPress ?down\b/i, "Extension poulie"],
    [/\bSkull ?Crushers?\b/i, "Barre au front"],
    [/\bKickback\b/i, "Kickback"],
    [/\bDips?\b/i, "Dips"],
    [/\bLeg Extension Crunch\b/i, "Crunch jambes tendues"],
    [/\bLeg Extension\b/i, "Leg extension"],
    [/\bLeg Press\b/i, "Presse à cuisses"],
    [/\bCalf Raise\b/i, "Mollets"],
    [/\bHip Thrust\b/i, "Hip thrust"],
    [/\bGlute Bridge\b/i, "Pont fessier"],
    [/\bLunges?\b/i, "Fentes"],
    [/\bStep[- ]?ups?\b/i, "Step-up"],
    [/\bHyperextension\b/i, "Extensions lombaires"],
    [/\bGood Morning\b/i, "Good morning"],
    [/\bPull Through\b/i, "Pull through"],
    [/\bBicycle\b/i, "bicyclette"],
    [/\bCrunch\b/i, "Crunch"],
    [/\bSit[- ]?ups?\b/i, "Relevés de buste"],
    [/\bLeg Raise\b/i, "Relevé de jambes"],
    [/\bKnee Raise\b/i, "Relevé de genoux"],
    [/\bBend\b/i, "Flexion"],
    [/\bRussian Twist\b/i, "Rotation russe"],
    [/\bTwist\b/i, "Rotation"],
    [/\bPlank\b/i, "Gainage"],
    [/\bRollout\b/i, "Roulette abdos"],
    [/\bWoodchop\b/i, "Bûcheron"],
    [/\bPush[- ]?ups?\b/i, "Pompes"],
    [/\bBurpees?\b/i, "Burpees"],
    [/\bJump Rope\b/i, "Corde à sauter"],
    [/\bMountain Climbers?\b/i, "Mountain climbers"],
    [/\bHigh Knees?\b/i, "Montées de genoux"],
    [/\bPress\b/, "Développé"],
    [/\bRaise\b/, "Élévation"],
  ];
  for (const [re, fr] of dico) n = n.replace(re, fr);
  n = n.replace(/\s+/g, " ").trim();
  // Réordonne « bicyclette Crunch » → « Crunch bicyclette » quand un mot-clé minuscule précède le mouvement capitalisé
  const mots = n.split(" ");
  if (mots.length >= 2 && /^[a-zà-ÿ]/.test(mots[0]) && /^[A-ZÀ-Ý]/.test(mots[1])) {
    const [m0, ...reste] = mots;
    n = [...reste, m0].join(" ");
  }
  const total = [n, ...suffixes].filter(Boolean).join(" ").trim();
  return total.charAt(0).toUpperCase() + total.slice(1);
}
