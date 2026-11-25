import { nomUsuel, LIBELLES, trierSeancesDuJour } from "@kvalia/core";
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
 * Nom affiché d'un exercice : celui qu'on entend en salle, en anglais (`nomUsuel` du noyau, ADR 0018). Les
 * descriptions, consignes et libellés autour restent en français.
 */
export function nomAffiche(e: { nom: string; nom_fr?: string | null }): string {
  return nomUsuel(e.nom);
}
