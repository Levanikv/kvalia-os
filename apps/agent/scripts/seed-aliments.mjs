#!/usr/bin/env node
/**
 * Seed du référentiel d'aliments génériques : table CIQUAL 2020 de l'ANSES (licence ouverte Etalab), convertie en
 * JSON dans supabase/seed/aliments_ciqual.json (3 000 aliments environ avec énergie, protéines, glucides, lipides pour 100 g).
 * Idempotent (upsert). Tourne là où Supabase est joignable : en local avec le .env racine.
 *   pnpm --filter @kvalia/agent seed:aliments
 *
 * Source : https://ciqual.anses.fr — « Table de composition nutritionnelle des aliments Ciqual 2020 ».
 * Les produits de marque ne sont pas ici : ils viennent d'Open Food Facts à la recherche (packages/core/src/aliments.ts).
 */
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ENV_RACINE = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(ENV_RACINE)) process.loadEnvFile(ENV_RACINE);
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

const aliments = JSON.parse(readFileSync(fileURLToPath(new URL("../../../supabase/seed/aliments_ciqual.json", import.meta.url)), "utf8"));
const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const lignes = aliments.map((a) => ({ ...a, source: "ciqual", cree_par: null }));
for (let i = 0; i < lignes.length; i += 500) {
  const { error } = await db.from("aliments").upsert(lignes.slice(i, i + 500), { onConflict: "id" });
  if (error) throw error;
  console.log(`${Math.min(i + 500, lignes.length)} / ${lignes.length}`);
}
const { count } = await db.from("aliments").select("id", { count: "exact", head: true }).eq("source", "ciqual");
console.log(`Aliments CIQUAL en base : ${count}`);
