/**
 * Nutrition — v1 minimal : la cible calorique du jour = base (réglages) + dépense sport du jour.
 * La dépense vient des séances (kcal créditées exercice par exercice, figées à « Terminer »).
 */
import { z } from "zod";
import type { KvaliaClient } from "./supabase";

export const ParametresNutrition = z.object({
  /** Dépense de base + activité hors sport (TDEE sans séance). */
  cible_kcal: z.number().int().min(1000).max(6000).default(2200),
  proteines_g: z.number().int().min(50).max(400).default(160),
  /** Reverser les kcal brûlées dans la cible du jour. */
  ajuster_avec_sport: z.boolean().default(true),
});
export type ParametresNutrition = z.infer<typeof ParametresNutrition>;
export const PARAMETRES_NUTRITION_DEFAUT: ParametresNutrition = ParametresNutrition.parse({});

export async function parametresNutrition(db: KvaliaClient, userId: string): Promise<ParametresNutrition> {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const brut = (data?.reglages as Record<string, unknown> | null)?.nutrition ?? {};
  const r = ParametresNutrition.safeParse(brut);
  return r.success ? r.data : PARAMETRES_NUTRITION_DEFAUT;
}

export async function enregistrerParametresNutrition(db: KvaliaClient, userId: string, params: ParametresNutrition) {
  const { data } = await db.from("profils").select("reglages").eq("id", userId).maybeSingle();
  const reglages = { ...((data?.reglages as Record<string, unknown>) ?? {}), nutrition: params };
  const { error } = await db.from("profils").update({ reglages }).eq("id", userId);
  if (error) throw error;
}

/** Bilan énergétique du jour : base, brûlé par le sport, cible ajustée, consommé (journal), reste. */
export async function bilanJour(db: KvaliaClient, userId: string, jour: string) {
  const params = await parametresNutrition(db, userId);
  const [{ data: seances }, { data: repas }] = await Promise.all([
    db.from("seances").select("id, titre, type, etat, kcal").eq("user_id", userId).eq("jour", jour),
    db.from("journal_repas").select("kcal, prot").eq("user_id", userId).eq("jour", jour),
  ]);
  const brule = (seances ?? []).reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const consomme = (repas ?? []).reduce((a, r) => a + Number(r.kcal ?? 0), 0);
  const proteines = (repas ?? []).reduce((a, r) => a + Number(r.prot ?? 0), 0);
  const cible = params.cible_kcal + (params.ajuster_avec_sport ? brule : 0);
  return {
    jour,
    base: params.cible_kcal,
    brule,
    cible,
    consomme,
    reste: cible - consomme,
    proteines,
    proteines_cible: params.proteines_g,
    seances: (seances ?? []).map((s) => ({ id: s.id, titre: s.titre, type: s.type, etat: s.etat, kcal: Number(s.kcal ?? 0) })),
  };
}
