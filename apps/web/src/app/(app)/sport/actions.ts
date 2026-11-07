"use server";
import { revalidatePath } from "next/cache";
import { executer, ParametresSport } from "@kvalia/core";
import { session } from "@/lib/session";

/** Toutes les actions passent par `executer` : même règle que l'agent (packages/core). */

export async function cocher(exerciceSeanceId: string, fait: boolean) {
  const { supabase, user } = await session();
  const r = await executer("cocher_exercice", { exercice_seance_id: exerciceSeanceId, fait }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath(`/sport/seance/${r.seance_id}`);
  revalidatePath("/");
  return r;
}

export async function terminer(seanceId: string, ressenti?: number, notes?: string) {
  const { supabase, user } = await session();
  const r = await executer("terminer_seance", { seance_id: seanceId, ressenti, notes }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath("/sport/historique");
  revalidatePath(`/sport/seance/${seanceId}`);
  revalidatePath("/nutrition");
  revalidatePath("/");
  return r;
}

export async function enregistrerParametres(brut: unknown) {
  const { supabase, user } = await session();
  const params = ParametresSport.parse(brut);
  const r = await executer("regler_sport", params, { db: supabase, userId: user.id });
  revalidatePath("/reglages/sport");
  revalidatePath("/sport");
  return r;
}

export async function genererProgramme(brut: unknown, debut?: string) {
  const { supabase, user } = await session();
  const params = ParametresSport.parse(brut);
  const r = await executer("generer_programme", { parametres: params, debut }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  revalidatePath("/reglages/sport");
  revalidatePath("/");
  return r;
}
