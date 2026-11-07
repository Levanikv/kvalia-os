"use server";
import { revalidatePath } from "next/cache";
import { executer } from "@kvalia/core";
import { session } from "@/lib/session";
import { parseArticles } from "@/lib/parse-articles";

export async function cocherLigne(id: string, coche: boolean) {
  const { supabase } = await session();
  const { error } = await supabase.from("lignes").update({ coche }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quotidien/courses");
  revalidatePath("/");
}

export async function supprimerLigne(id: string) {
  const { supabase } = await session();
  const { error } = await supabase.from("lignes").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quotidien/courses");
  revalidatePath("/");
}

/** Ajout rapide depuis l'app : même règle que l'outil MCP `ajouter_produit` (packages/core). */
export async function ajouterArticles(texte: string) {
  const articles = parseArticles(texte);
  if (articles.length === 0) return { ajoutes: 0 };
  const { supabase, user } = await session();
  const sortie = await executer("ajouter_produit", { articles, origine: "manuel" }, { db: supabase, userId: user.id });
  revalidatePath("/quotidien/courses");
  revalidatePath("/");
  return { ajoutes: sortie.lignes.length };
}

export async function faireTache(id: string, fait: boolean) {
  const { supabase } = await session();
  const { error } = await supabase.from("taches").update({ fait, fait_le: fait ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quotidien/taches");
  revalidatePath("/");
}

export async function ajouterTache(titre: string, due: string | null) {
  const { supabase, user } = await session();
  await executer("ajouter_tache", { titre, due: due ?? undefined, priorite: "normale" }, { db: supabase, userId: user.id });
  revalidatePath("/quotidien/taches");
  revalidatePath("/");
}

export async function cocherHabitude(habitudeId: string, jour: string, fait: boolean) {
  const { supabase, user } = await session();
  const { error } = await supabase
    .from("habitudes_log")
    .upsert({ user_id: user.id, habitude_id: habitudeId, jour, fait }, { onConflict: "habitude_id,jour" });
  if (error) throw new Error(error.message);
  revalidatePath("/quotidien/habitudes");
  revalidatePath("/");
}
