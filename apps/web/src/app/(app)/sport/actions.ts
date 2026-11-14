"use server";
import { revalidatePath } from "next/cache";
import { ciblesDepuisProfil, executer, ParametresSport, parametresDepuisReponses, parametresSport, ReponsesProgramme } from "@kvalia/core";
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

export async function terminer(seanceId: string, ressenti?: number, notes?: string, rates: string[] = []) {
  const { supabase, user } = await session();
  const r = await executer("terminer_seance", { seance_id: seanceId, ressenti, notes, rates }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath("/sport/historique");
  revalidatePath(`/sport/seance/${seanceId}`);
  revalidatePath("/nutrition");
  revalidatePath("/");
  return r;
}

/** « Démarrer la séance » : lance le chrono (outil demarrer_seance). */
export async function demarrer(seanceId: string) {
  const { supabase, user } = await session();
  const r = await executer("demarrer_seance", { seance_id: seanceId }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath(`/sport/seance/${seanceId}`);
  return r;
}

/** Tap sur le chrono : pause / reprise (outil chrono_seance). */
export async function chrono(seanceId: string, action: "pause" | "reprendre") {
  const { supabase, user } = await session();
  const r = await executer("chrono_seance", { seance_id: seanceId, action }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath(`/sport/seance/${seanceId}`);
  return r;
}

/** « Valider la série n » dans la fiche exercice (outil valider_serie). */
export async function validerSerieAction(exerciceSeanceId: string, maj: { reps?: number | null; charge_kg?: number | null }) {
  const { supabase, user } = await session();
  const r = await executer("valider_serie", { exercice_seance_id: exerciceSeanceId, ...maj }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath(`/sport/seance/${r.seance_id}`);
  revalidatePath("/");
  return r;
}

/** Historique d'un exercice (fiche « historique & charge »). */
export async function historiqueAction(exerciceId: string) {
  const { supabase, user } = await session();
  return executer("historique_exercice", { exercice_id: exerciceId, limite: 12 }, { db: supabase, userId: user.id });
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

/**
 * Parcours « Nouveau programme » / « Modifier le programme » (onglet Programme) : réponses → paramètres (règle du
 * noyau) → generer_programme (même outil que l'agent). Rend aussi la première séance pour l'écran « C'est parti ».
 */
export async function creerProgramme(brut: unknown, debut: string) {
  const { supabase, user } = await session();
  const reponses = ReponsesProgramme.parse(brut);
  const base = await parametresSport(supabase, user.id);
  const r = await executer("generer_programme", { parametres: parametresDepuisReponses(base, reponses), debut }, { db: supabase, userId: user.id });
  const { data: premiere } = await supabase
    .from("seances")
    .select("id, jour, titre, type, duree_min, exercices_seance(id)")
    .eq("programme_id", r.programme_id)
    .neq("type", "boxe")
    .order("jour")
    .limit(1)
    .maybeSingle();
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  revalidatePath("/reglages/sport");
  revalidatePath("/nutrition");
  revalidatePath("/");
  return {
    debut: r.debut,
    fin: r.fin,
    nb_seances: r.nb_seances,
    premiere: premiere
      ? { id: premiere.id, jour: premiere.jour, titre: premiere.titre, duree_min: premiere.duree_min, exercices: premiere.exercices_seance?.length ?? 0 }
      : null,
  };
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

// ---------- Onboarding (première connexion) ----------
type Profil = NonNullable<ParametresSport["profil"]>;

/** Enregistre les réponses données jusqu'ici et l'étape où reprendre (« Continuer »). */
export async function sauverOnboarding(profil: Profil, etape: number) {
  const { supabase, user } = await session();
  await executer("regler_sport", { profil, onboarding: { etape } }, { db: supabase, userId: user.id });
}

/** « Plus tard » : on garde les réponses et l'étape, la Home Sport propose de reprendre. */
export async function passerOnboarding(profil: Profil, etape: number) {
  const { supabase, user } = await session();
  await executer("regler_sport", { profil, onboarding: { etape, passe: true } }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
}

/** Dernière réponse : on fige le profil, puis on génère le programme (même outil que l'agent). */
export async function terminerOnboarding(profil: Profil, etape: number) {
  const { supabase, user } = await session();
  const params = await executer("regler_sport", { profil, onboarding: { etape, termine: true, passe: false } }, { db: supabase, userId: user.id });
  const r = await executer("generer_programme", {}, { db: supabase, userId: user.id });
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  revalidatePath("/nutrition");
  revalidatePath("/");
  return { debut: r.debut, fin: r.fin, nb_seances: r.nb_seances, semaines: params.semaines, cibles: ciblesDepuisProfil(params.profil) };
}
