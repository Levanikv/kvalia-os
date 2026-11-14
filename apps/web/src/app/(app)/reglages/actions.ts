"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { executer } from "@kvalia/core";
import { session } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function deconnexion() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}

/** TEMPORAIRE (tests v0, à retirer en v1) : remet Sport à zéro via l'outil du noyau, puis renvoie à l'onboarding. */
export async function reinitialiserSportAction() {
  const { supabase, user } = await session();
  const r = await executer("reinitialiser_sport", { confirmer: true }, { db: supabase, userId: user.id });
  revalidatePath("/", "layout");
  return r;
}
