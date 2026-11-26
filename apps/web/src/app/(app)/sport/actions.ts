"use server";
import { revalidatePath } from "next/cache";
import {
  ciblesDepuisProfil,
  DefiEntree,
  executer,
  ModificationDefi,
  NotationDefi,
  ModeleSeanceEntree,
  ModificationProgramme,
  ParametresSport,
  parametresDepuisReponses,
  parametresSport,
  ReponsesProgramme,
  SeanceALaCarte,
  type ModeSport,
} from "@kvalia/core";
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
export async function sauverOnboarding(profil: Profil, etape: number, mode: ModeSport) {
  const { supabase, user } = await session();
  await executer("regler_sport", { profil, mode, onboarding: { etape } }, { db: supabase, userId: user.id });
}

/** « Plus tard » : on garde les réponses et l'étape, la Home Sport propose de reprendre. */
export async function passerOnboarding(profil: Profil, etape: number, mode: ModeSport) {
  const { supabase, user } = await session();
  await executer("regler_sport", { profil, mode, onboarding: { etape, passe: true } }, { db: supabase, userId: user.id });
  revalidatePath("/sport");
}

/**
 * Dernière réponse : on fige le profil et la façon de s'entraîner. Un programme n'est généré que si on a choisi d'en
 * suivre un (même outil que l'agent) ; à la carte ou avec ses propres séances, l'app est prête telle quelle.
 */
export async function terminerOnboarding(profil: Profil, etape: number, mode: ModeSport, debut?: string) {
  const { supabase, user } = await session();
  const params = await executer("regler_sport", { profil, mode, onboarding: { etape, termine: true, passe: false } }, { db: supabase, userId: user.id });
  const cibles = ciblesDepuisProfil(params.profil);
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  revalidatePath("/nutrition");
  revalidatePath("/");
  if (mode !== "programme") return { mode, cibles, programme: null };
  // « Quand commencer ? » : le noyau cale la date sur un jour de séance (aujourd'hui si c'en est un).
  const r = await executer("generer_programme", debut ? { debut } : {}, { db: supabase, userId: user.id });
  const { data: premiere } = await supabase
    .from("seances")
    .select("id, jour, titre")
    .eq("programme_id", r.programme_id)
    .neq("type", "boxe")
    .order("jour")
    .limit(1)
    .maybeSingle();
  return { mode, cibles, programme: { debut: r.debut, fin: r.fin, nb_seances: r.nb_seances, semaines: params.semaines, premiere } };
}

// ---------- S'entraîner aujourd'hui (séance à la carte, favoris) ----------

/** Compose la séance du jour (outil seance_a_la_carte). L'erreur revient en clair : Next masque les messages en production. */
export async function composerSeanceAction(brut: unknown) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("seance_a_la_carte", SeanceALaCarte.parse(brut), { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

/** Lance aujourd'hui une de ses séances (outil planifier_seance_perso, une seule fois). */
export async function lancerMaSeanceAction(modeleId: string, date: string) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("planifier_seance_perso", { modele_id: modeleId, date }, { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

export async function garderSeanceAction(seanceId: string, nom?: string) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("enregistrer_seance_favorite", { seance_id: seanceId, nom }, { db: supabase, userId: user.id });
    revalidatePath("/sport/programme");
    revalidatePath(`/sport/seance/${seanceId}`);
    return r;
  });
}

export async function annulerSeanceAction(seanceId: string) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("annuler_seance", { seance_id: seanceId }, { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

/** Change la façon de s'entraîner (outil regler_sport). */
export async function changerModeAction(mode: ModeSport) {
  const { supabase, user } = await session();
  await executer("regler_sport", { mode }, { db: supabase, userId: user.id });
  revaliderSport();
  revalidatePath("/reglages/sport");
}

// ---------- Modifier le programme / Mes séances (outils du noyau, comme l'agent) ----------

function revaliderSport() {
  revalidatePath("/sport");
  revalidatePath("/sport/programme");
  revalidatePath("/nutrition");
  revalidatePath("/");
}

export async function modifierProgrammeAction(brut: unknown) {
  const { supabase, user } = await session();
  const r = await executer("modifier_programme", ModificationProgramme.parse(brut), { db: supabase, userId: user.id });
  revaliderSport();
  return r;
}

export async function creerSeancePersoAction(brut: unknown) {
  const { supabase, user } = await session();
  const r = await executer("creer_seance_perso", ModeleSeanceEntree.parse(brut), { db: supabase, userId: user.id });
  revalidatePath("/sport/programme");
  return r;
}

export async function modifierSeancePersoAction(id: string, brut: unknown) {
  const { supabase, user } = await session();
  const r = await executer("modifier_seance_perso", { ...ModeleSeanceEntree.parse(brut), id }, { db: supabase, userId: user.id });
  revaliderSport();
  return r;
}

export async function supprimerSeancePersoAction(id: string) {
  const { supabase, user } = await session();
  const r = await executer("supprimer_seance_perso", { id }, { db: supabase, userId: user.id });
  revaliderSport();
  return r;
}

export async function planifierSeancePersoAction(e: { modele_id: string; jour_semaine?: number; date?: string; a_partir_de?: string }) {
  const { supabase, user } = await session();
  const r = await executer("planifier_seance_perso", e, { db: supabase, userId: user.id });
  revaliderSport();
  return r;
}

// ---------- Défis du programme ----------
/** En production, Next masque le message d'une erreur levée dans une server action : on le renvoie explicitement. */
type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

async function tenter<T>(f: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, valeur: await f() };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

export async function creerDefiAction(brut: unknown) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("creer_defi", DefiEntree.parse(brut), { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

export async function modifierDefiAction(brut: unknown) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("modifier_defi", ModificationDefi.parse(brut), { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

export async function noterDefiAction(brut: unknown) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("noter_defi", NotationDefi.parse(brut), { db: supabase, userId: user.id });
    revalidatePath("/sport");
    revalidatePath("/sport/programme");
    revalidatePath("/");
    return r;
  });
}

export async function supprimerDefiAction(id: string) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("supprimer_defi", { id }, { db: supabase, userId: user.id });
    revaliderSport();
    return r;
  });
}

/** Reporter une séance ou l'amener à un autre jour (outil deplacer_seance). L'erreur revient en clair. */
export async function deplacerSeanceAction(seanceId: string, jour: string, si_occupe: "decaler" | "echanger", suite: "garder" | "avancer" = "garder") {
  const { supabase, user } = await session();
  try {
    const valeur = await executer("deplacer_seance", { seance_id: seanceId, jour, si_occupe, suite }, { db: supabase, userId: user.id });
    revalidatePath("/sport");
    revalidatePath("/sport/programme");
    revalidatePath("/nutrition");
    revalidatePath("/");
    return { ok: true as const, valeur };
  } catch (e) {
    return { ok: false as const, erreur: e instanceof Error ? e.message : "Déplacement impossible." };
  }
}
