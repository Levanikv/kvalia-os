/**
 * Référentiel d'exercices (ADR 0019) : sème `supabase/seed/exercices_ref.source.json` dans `exercices_ref` et range
 * l'ancienne bibliothèque. Idempotent : ne fait rien si la base est déjà à jour. L'agent l'appelle au démarrage
 * (clé service role), donc un déploiement suffit à mettre la bibliothèque à niveau ; à la main :
 * `pnpm --filter @kvalia/agent seed:exercices`.
 *
 * Les exercices de l'ancienne bibliothèque restent en base (des séances faites y renvoient) mais ne sont plus
 * proposés (`SOURCE_EXERCICES`). Leurs vidéos ne chargent plus : leurs liens sont retirés, et quand un exercice du
 * même nom existe dans la nouvelle bibliothèque, son animation et sa vignette sont reprises.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createServiceClient, type KvaliaClient, SOURCE_EXERCICES, type TablesInsert } from "@kvalia/core";

const FICHIER = fileURLToPath(new URL("../../../supabase/seed/exercices_ref.source.json", import.meta.url));
const LOT = 200;

export async function semerExercices(db: KvaliaClient): Promise<{ semes: number; ranges: number }> {
  const lignes = JSON.parse(readFileSync(FICHIER, "utf8")) as Array<TablesInsert<"exercices_ref"> & { gif_url: string; image_url: string }>;
  const [{ count: enBase }, { count: aRanger }] = await Promise.all([
    db.from("exercices_ref").select("id", { count: "exact", head: true }).eq("source", SOURCE_EXERCICES),
    db.from("exercices_ref").select("id", { count: "exact", head: true }).neq("source", SOURCE_EXERCICES).not("video_url", "is", null),
  ]);

  let semes = 0;
  if (enBase !== lignes.length) {
    for (let i = 0; i < lignes.length; i += LOT) {
      const lot = lignes.slice(i, i + LOT).map((l) => ({ ...l, updated_at: new Date().toISOString() }));
      const { error } = await db.from("exercices_ref").upsert(lot, { onConflict: "id" });
      if (error) throw new Error(`Exercices, lot ${i / LOT + 1} : ${error.message}`);
      semes += lot.length;
    }
  }

  let ranges = 0;
  if (aRanger) {
    const parNom = new Map(lignes.map((l) => [l.nom.toLowerCase(), l]));
    const { data: anciens, error } = await db.from("exercices_ref").select("id, nom").neq("source", SOURCE_EXERCICES).not("video_url", "is", null);
    if (error) throw error;
    for (const a of anciens ?? []) {
      const pareil = parNom.get(a.nom.toLowerCase());
      const { error: errMaj } = await db
        .from("exercices_ref")
        .update({ video_url: null, video_url_f: null, image_url_f: null, image_url: pareil?.image_url ?? null, gif_url: pareil?.gif_url ?? null })
        .eq("id", a.id);
      if (errMaj) throw errMaj;
      ranges++;
    }
  }
  return { semes, ranges };
}

// Lancé directement : `tsx src/semer-exercices.ts`.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = await semerExercices(createServiceClient());
  console.log(`Exercices : ${r.semes} semés, ${r.ranges} anciens rangés.`);
}
