/**
 * Essai hors-ligne du générateur : simule Supabase sur le JSON source du seed et imprime une semaine.
 *   pnpm --filter @kvalia/core exec tsx scripts/essai-generateur.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { genererProgramme, PARAMETRES_SPORT_DEFAUT, type ParametresSport } from "../src/sport";

const src = JSON.parse(readFileSync(fileURLToPath(new URL("../../../supabase/seed/exercices_ref.source.json", import.meta.url)), "utf8")) as Array<Record<string, any>>;
const met = (e: any) => (e.bodyPart === "cardio" ? 8 : e.equipment === "body weight" ? (e.compound ? 5 : 3.8) : e.compound ? 6 : 4.5);
const refs = src.map((e) => ({
  id: e.id, nom: e.name, muscles: [e.target, ...(e.muscleGroup && e.muscleGroup !== e.target ? [e.muscleGroup] : [])].filter(Boolean),
  muscles_secondaires: e.secondaryMuscles ?? [], equipement: e.equipment ?? null, partie_corps: e.bodyPart ?? null,
  difficulte: e.difficulty ?? null, compose: Boolean(e.compound), unilateral: Boolean(e.unilateral), met: met(e),
}));

// Faux client : juste ce que genererProgramme touche.
const tables: Record<string, any[]> = { exercices_ref: refs, programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [] };
let compteur = 0;
function from(table: string) {
  const rows = tables[table];
  const q: any = {
    _f: [] as Array<(r: any) => boolean>, _rows: rows,
    select() { return q; }, eq(c: string, v: any) { q._f.push((r: any) => r[c] === v); return q; },
    in(c: string, v: any[]) { q._f.push((r: any) => v.includes(r[c])); return q; },
    gte(c: string, v: any) { q._f.push((r: any) => r[c] >= v); return q; },
    order() { return q; }, limit() { return q; },
    maybeSingle() { return Promise.resolve({ data: rows.filter((r) => q._f.every((f: any) => f(r)))[0] ?? null, error: null }); },
    single() { return Promise.resolve({ data: q._inseres?.[0] ?? null, error: null }); },
    then(res: any) { res({ data: rows.filter((r) => q._f.every((f: any) => f(r))), error: null }); },
    insert(v: any) {
      const arr = (Array.isArray(v) ? v : [v]).map((r) => ({ id: `id-${++compteur}`, ...r }));
      rows.push(...arr); q._inseres = arr;
      return { select: () => ({ single: () => Promise.resolve({ data: arr[0], error: null }), then: (res: any) => res({ data: arr, error: null }) }), then: (res: any) => res({ error: null }) };
    },
    update() { return { eq: () => Promise.resolve({ error: null }) }; },
    delete() { return q; },
  };
  return q;
}
const db = { from } as any;

const params: ParametresSport = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 82, semaines: 12 };
const r = await genererProgramme(db, "u", params, "2026-11-09");
console.log(r);
const parId = new Map(refs.map((x) => [x.id, x]));
for (const s of tables.seances.filter((s) => s.semaine === 1 || s.semaine === 4)) {
  const exos = tables.exercices_seance.filter((e) => e.seance_id === s.id).sort((a, b) => a.ordre - b.ordre);
  console.log(`\n${s.jour} · S${s.semaine} B${s.bloc} · ${s.titre} (${s.type}) · ${s.duree_min} min · focus ${s.focus} · ${exos.reduce((a, e) => a + e.kcal, 0)} kcal`);
  for (const e of exos) console.log(`   ${e.ordre + 1}. ${parId.get(e.exercice_id)?.nom}  — ${e.series}×${e.reps}, repos ${e.repos_s}s, ${e.kcal} kcal  [${parId.get(e.exercice_id)?.equipement}]`);
  if (s.notes) console.log("   " + s.notes);
}
