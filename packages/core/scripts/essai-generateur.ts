/**
 * Essai hors-ligne du générateur : simule Supabase sur le JSON source du seed et imprime les semaines 1 et 4.
 *   pnpm --filter @kvalia/core exec tsx scripts/essai-generateur.ts
 */
import { PARAMETRES_SPORT_DEFAUT, type ParametresSport, genererProgramme } from "../src/sport";
import { USER, exercicesRef, fausseDb } from "../test/fausse-db";

const refs = exercicesRef();
const db = fausseDb({ exercices_ref: refs, programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [{ id: USER, reglages: {} }] });
const params: ParametresSport = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 82, semaines: 12 };
const r = await genererProgramme(db, USER, params, "2026-11-09");
console.log(r);
const parId = new Map(refs.map((x) => [x.id, x]));
for (const s of db.tables.seances.filter((s: any) => s.semaine === 1 || s.semaine === 4)) {
  const exos = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).sort((a: any, b: any) => a.ordre - b.ordre);
  console.log(
    `\n${s.jour} · S${s.semaine} B${s.bloc} · ${s.titre} (${s.type}) · ${s.duree_min} min · focus ${s.focus} · ${exos.reduce((a: number, e: any) => a + e.kcal, 0)} kcal`,
  );
  for (const e of exos)
    console.log(
      `   ${e.ordre + 1}. ${parId.get(e.exercice_id)?.nom}  — ${e.series}×${e.reps}, repos ${e.repos_s}s, ${e.kcal} kcal  [${parId.get(e.exercice_id)?.equipement}]`,
    );
  if (s.notes) console.log("   " + s.notes);
}
