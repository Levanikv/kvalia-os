#!/usr/bin/env node
/**
 * Seed du référentiel d'exercices depuis free-exercise-db-with-videos (MIT, 317 exercices, vidéos 1080p).
 * Idempotent (upsert). Tourne là où Supabase est joignable : en local avec le .env racine, ou sur Railway
 * en pre-deploy (`pnpm --filter @kvalia/agent seed:exercices`).
 *
 * Source : https://github.com/imjosiel/free-exercise-db-api (fork de amiinwani/free-exercise-db-with-videos)
 * Réserve : la provenance des vidéos n'est pas documentée par l'auteur ; les URLs sont en base, donc remplaçables.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const ENV_RACINE = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(ENV_RACINE)) process.loadEnvFile(ENV_RACINE);

const URL_SOURCE = process.env.EXERCICES_SOURCE_URL ?? "https://raw.githubusercontent.com/imjosiel/free-exercise-db-api/main/data/exercises.json";
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");

/** MET (Compendium of Physical Activities) par grande famille — sert à l'estimation calorique. */
function met(e) {
  if (e.bodyPart === "cardio") return 8.0;
  if (e.equipment === "body weight") return e.compound ? 5.0 : 3.8;
  return e.compound ? 6.0 : 4.5;
}

const res = await fetch(URL_SOURCE);
if (!res.ok) throw new Error(`Téléchargement impossible : HTTP ${res.status}`);
const data = await res.json();
console.log(`${data.length} exercices téléchargés`);

const rows = data.map((e) => ({
  id: e.id,
  source: "free-exercise-db-with-videos",
  nom: e.name,
  muscles: [e.target, ...(e.muscleGroup && e.muscleGroup !== e.target ? [e.muscleGroup] : [])].filter(Boolean),
  muscles_secondaires: e.secondaryMuscles ?? [],
  equipement: e.equipment ?? null,
  video_url: e.videos?.male ?? null,
  image_url: e.thumbnails?.male ?? null,
  video_url_f: e.videos?.female ?? null,
  image_url_f: e.thumbnails?.female ?? null,
  consignes: e.steps?.length ? e.steps : e.instructions ? [e.instructions] : [],
  partie_corps: e.bodyPart ?? null,
  difficulte: e.difficulty ?? null,
  compose: Boolean(e.compound),
  unilateral: Boolean(e.unilateral),
  alias: e.aliases ?? [],
  description: e.shortDescription ?? null,
  erreurs: e.commonMistakes ?? [],
  reperes: e.formCues ?? [],
  respiration: e.breathing ?? null,
  met: met(e),
  updated_at: new Date().toISOString(),
}));

const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let total = 0;
for (let i = 0; i < rows.length; i += 100) {
  const lot = rows.slice(i, i + 100);
  const { error } = await db.from("exercices_ref").upsert(lot, { onConflict: "id" });
  if (error) throw new Error(`Lot ${i / 100 + 1} : ${error.message}`);
  total += lot.length;
  console.log(`  ${total} / ${rows.length}`);
}
const { count } = await db.from("exercices_ref").select("id", { count: "exact", head: true });
console.log(`Terminé — ${count} exercices en base.`);
