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

export async function noterChargeAction(exerciceSeanceId: string, maj: { charge_kg?: number | null; reps_faites?: number | null; note?: string | null }) {
  const { supabase, user } = await session();
  const r = await executer("noter_charge", { exercice_seance_id: exerciceSeanceId, ...maj }, { db: supabase, userId: user.id });
  revalidatePath(`/sport/seance/${r.seance_id}`);
  revalidatePath(`/sport/exercices/${r.exercice_id}`);
  return r;
}

export async function equivalentsAction(exerciceSeanceId: string) {
  const { supabase, user } = await session();
  return executer("equivalents_exercice", { exercice_seance_id: exerciceSeanceId, limite: 8 }, { db: supabase, userId: user.id });
}

export async function remplacerAction(exerciceSeanceId: string, nouvelExerciceId: string, portee: "seance" | "programme") {
  const { supabase, user } = await session();
  const r = await executer(
    "remplacer_exercice",
    { exercice_seance_id: exerciceSeanceId, nouvel_exercice_id: nouvelExerciceId, portee },
    { db: supabase, userId: user.id },
  );
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  return r;
}
