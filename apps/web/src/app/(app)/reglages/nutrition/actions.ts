"use server";
import { revalidatePath } from "next/cache";
import { enregistrerParametresNutrition, ParametresNutrition } from "@kvalia/core";
import { session } from "@/lib/session";

export async function enregistrerParametresNutritionAction(brut: unknown) {
  const { supabase, user } = await session();
  await enregistrerParametresNutrition(supabase, user.id, ParametresNutrition.parse(brut));
  revalidatePath("/nutrition");
  revalidatePath("/sport");
  revalidatePath("/reglages/nutrition");
}
