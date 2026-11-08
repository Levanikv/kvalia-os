/**
 * Génère un programme hors-ligne (même code que l'agent) et écrit le SQL d'insertion dans /tmp/prog-*.sql.
 * Utile quand on n'a pas de réseau vers Supabase mais un accès SQL (MCP Supabase).
 *   pnpm --filter @kvalia/core exec tsx scripts/programme-sql.ts <user_id> <debut ISO> [poids_kg]
 */
import { writeFileSync } from "node:fs";
import { PARAMETRES_SPORT_DEFAUT, type ParametresSport, genererProgramme } from "../src/sport";
import { exercicesRef, fausseDb } from "../test/fausse-db";

const [userId, debut, poidsArg] = process.argv.slice(2);
if (!userId || !debut) throw new Error("user_id et debut requis");
const db = fausseDb({ exercices_ref: exercicesRef(), programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [{ id: userId, reglages: {} }] });
const params: ParametresSport = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: poidsArg ? Number(poidsArg) : undefined };
await genererProgramme(db, userId, params, debut);

const lit = (v: unknown): string =>
  v === null || v === undefined
    ? "null"
    : typeof v === "number"
      ? String(v)
      : typeof v === "boolean"
        ? v
          ? "true"
          : "false"
        : Array.isArray(v)
          ? `array[${v.map((x) => lit(x)).join(",")}]::text[]`
          : typeof v === "object"
            ? `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`
            : `'${String(v).replace(/'/g, "''")}'`;
const ins = (table: string, rows: any[], cols: string[]) =>
  rows.length ? `insert into public.${table} (${cols.join(",")}) values\n${rows.map((r) => `(${cols.map((c) => lit(r[c])).join(",")})`).join(",\n")};` : "";
const out: string[] = [];
out.push(`update public.programmes set actif=false where user_id='${userId}' and actif;`);
out.push(ins("programmes", db.tables.programmes, ["id", "user_id", "nom", "debut", "fin", "rythme", "materiel", "actif", "genere_par"]));
out.push(
  ins("seances", db.tables.seances, ["id", "user_id", "programme_id", "jour", "type", "titre", "duree_min", "etat", "bloc", "semaine", "focus", "notes"]),
);
const exos = db.tables.exercices_seance;
for (let i = 0; i < exos.length; i += 150)
  out.push(ins("exercices_seance", exos.slice(i, i + 150), ["user_id", "seance_id", "exercice_id", "ordre", "series", "reps", "repos_s", "duree_s", "kcal"]));
out.push(`update public.profils set reglages = coalesce(reglages,'{}'::jsonb) || jsonb_build_object('sport', ${lit(params)}) where id='${userId}';`);
out.forEach((sql, i) => {
  writeFileSync(`/tmp/prog-${i}.sql`, sql);
});
console.log(`${db.tables.seances.length} séances, ${exos.length} exercices → /tmp/prog-0..${out.length - 1}.sql`);
