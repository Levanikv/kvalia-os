/**
 * Génère un programme hors-ligne (même code que l'agent) et imprime le SQL d'insertion.
 * Usage : pnpm --filter @kvalia/core exec tsx scripts/programme-sql.ts <user_id> <debut ISO> [poids_kg]
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { genererProgramme, PARAMETRES_SPORT_DEFAUT, type ParametresSport } from "../src/sport";

const [userId, debut, poidsArg] = process.argv.slice(2);
if (!userId || !debut) throw new Error("user_id et debut requis");
const src = JSON.parse(readFileSync(fileURLToPath(new URL("../../../supabase/seed/exercices_ref.source.json", import.meta.url)), "utf8")) as Array<Record<string, any>>;
const met = (e: any) => (e.bodyPart === "cardio" ? 8 : e.equipment === "body weight" ? (e.compound ? 5 : 3.8) : e.compound ? 6 : 4.5);
const refs = src.map((e) => ({
  id: e.id, nom: e.name, muscles: [e.target, ...(e.muscleGroup && e.muscleGroup !== e.target ? [e.muscleGroup] : [])].filter(Boolean),
  muscles_secondaires: e.secondaryMuscles ?? [], equipement: e.equipment ?? null, partie_corps: e.bodyPart ?? null,
  difficulte: e.difficulty ?? null, compose: Boolean(e.compound), unilateral: Boolean(e.unilateral), met: met(e),
}));
const tables: Record<string, any[]> = { exercices_ref: refs, programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [] };
function from(table: string) {
  const rows = tables[table];
  const q: any = {
    _f: [] as Array<(r: any) => boolean>,
    select() { return q; }, eq(c: string, v: any) { q._f.push((r: any) => r[c] === v); return q; },
    in(c: string, v: any[]) { q._f.push((r: any) => v.includes(r[c])); return q; }, gte(c: string, v: any) { q._f.push((r: any) => r[c] >= v); return q; },
    order() { return q; }, limit() { return q; },
    maybeSingle() { return Promise.resolve({ data: rows.filter((r) => q._f.every((f: any) => f(r)))[0] ?? null, error: null }); },
    then(res: any) { res({ data: rows.filter((r) => q._f.every((f: any) => f(r))), error: null }); },
    insert(v: any) {
      const arr = (Array.isArray(v) ? v : [v]).map((r) => ({ id: randomUUID(), ...r }));
      rows.push(...arr);
      return { select: () => ({ single: () => Promise.resolve({ data: arr[0], error: null }), then: (res: any) => res({ data: arr, error: null }) }), then: (res: any) => res({ error: null }) };
    },
    update() { return { eq: () => Promise.resolve({ error: null }) }; }, delete() { return q; },
  };
  return q;
}
const params: ParametresSport = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: poidsArg ? Number(poidsArg) : undefined };
await genererProgramme({ from } as any, userId, params, debut);

const lit = (v: unknown) => v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : typeof v === "boolean" ? (v ? "true" : "false")
  : Array.isArray(v) ? `array[${v.map((x) => lit(x)).join(",")}]::text[]` : typeof v === "object" ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb` : `'${String(v).replace(/'/g, "''")}'`;
const ins = (table: string, rows: any[], cols: string[]) => rows.length ? `insert into public.${table} (${cols.join(",")}) values\n${rows.map((r) => `(${cols.map((c) => lit(r[c])).join(",")})`).join(",\n")};` : "";
const out: string[] = [];
out.push(`update public.programmes set actif=false where user_id='${userId}' and actif;`);
out.push(ins("programmes", tables.programmes, ["id", "user_id", "nom", "debut", "fin", "rythme", "materiel", "actif", "genere_par"]));
out.push(ins("seances", tables.seances, ["id", "user_id", "programme_id", "jour", "type", "titre", "duree_min", "etat", "bloc", "semaine", "focus", "notes"]));
const exos = tables.exercices_seance;
for (let i = 0; i < exos.length; i += 150) out.push(ins("exercices_seance", exos.slice(i, i + 150), ["user_id", "seance_id", "exercice_id", "ordre", "series", "reps", "repos_s", "duree_s", "kcal"]));
out.push(`update public.profils set reglages = coalesce(reglages,'{}'::jsonb) || jsonb_build_object('sport', ${lit(params)}) where id='${userId}';`);
import { writeFileSync } from "node:fs";
out.forEach((sql, i) => writeFileSync(`/tmp/prog-${i}.sql`, sql));
console.log(`${tables.seances.length} séances, ${exos.length} exercices → /tmp/prog-0..${out.length - 1}.sql`);
