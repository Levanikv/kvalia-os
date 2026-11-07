/**
 * Contrat des outils MCP (v0 — phase 0 : 5 outils).
 * Chaque outil = nom + description + schéma d'entrée + schéma de sortie.
 * Le serveur MCP (apps/agent) et l'API (apps/web) consomment ce fichier ; personne ne redéfinit ces types ailleurs.
 */
import { z } from "zod";
import { Ligne, Priorite, Tache, VueJour } from "./schemas";
import { ParametresSport } from "./sport";

const ExerciceSeanceSortie = z.object({
  id: z.string().uuid(),
  ordre: z.number().int(),
  exercice: z.string(),
  exercice_id: z.string(),
  partie_corps: z.string().nullable(),
  series: z.number().int(),
  reps: z.string(),
  repos_s: z.number().int(),
  duree_s: z.number().nullable(),
  kcal: z.number().nullable(),
  fait: z.boolean(),
});

const SeanceSortie = z.object({
  id: z.string().uuid(),
  jour: z.string().date(),
  type: z.string(),
  titre: z.string().nullable(),
  etat: z.string(),
  focus: z.string().nullable(),
  bloc: z.number().nullable(),
  semaine: z.number().nullable(),
  duree_min: z.number().nullable(),
  kcal: z.number().nullable(),
  kcal_prevues: z.number(),
  notes: z.string().nullable(),
  exercices: z.array(ExerciceSeanceSortie),
});

export const tools = {
  ajouter_produit: {
    description:
      "Ajoute un ou plusieurs articles à la liste de courses active. Crée le produit s'il n'existe pas. Fusionne les doublons (quantité cumulée).",
    input: z.object({
      articles: z.array(z.object({
        nom: z.string().min(1).describe("Nom du produit, ex. « skyr »"),
        quantite: z.number().positive().default(1),
        unite: z.string().optional(),
      })).min(1),
      origine: z.enum(["agent", "siri", "alexa", "telegram", "manuel"]).default("agent"),
    }),
    output: z.object({ liste_id: z.string().uuid(), lignes: z.array(Ligne) }),
  },

  liste_actuelle: {
    description: "Renvoie la liste de courses active, groupée par rayon, avec les manques signalés.",
    input: z.object({}),
    output: z.object({
      liste_id: z.string().uuid().nullable(),
      rayons: z.array(z.object({
        rayon: z.string().nullable(),
        lignes: z.array(Ligne.extend({ produit: z.string() })),
      })),
    }),
  },

  ajouter_tache: {
    description: "Crée une tâche. La date accepte « demain », « vendredi », « 12/11 » ou une date ISO.",
    input: z.object({
      titre: z.string().min(1),
      due: z.string().optional().describe("Date relative ou ISO ; vide = sans échéance"),
      priorite: Priorite.default("normale"),
    }),
    output: Tache,
  },

  agenda_du_jour: {
    description: "Les événements de l'agenda pour un jour (aujourd'hui par défaut). Stub en phase 0, réel en phase 1.",
    input: z.object({ jour: z.string().date().optional() }),
    output: z.object({
      jour: z.string().date(),
      evenements: VueJour.shape.evenements,
    }),
  },

  brief: {
    description:
      "Le condensé du jour : rendez-vous, séance, repas, tâches, habitudes, courses, dépenses de la semaine, alertes. Même données que la Home.",
    input: z.object({ jour: z.string().date().optional() }),
    output: VueJour,
  },

  // ---------- Sport ----------
  parametres_sport: {
    description:
      "Lit les paramètres du programme sportif (rythme salle/boxe, jours, durée, matériel, objectif, niveau, poids de secours). Ce sont les réglages de l'admin.",
    input: z.object({}),
    output: ParametresSport,
  },

  regler_sport: {
    description:
      "Modifie un ou plusieurs paramètres du programme sportif (ex. passer à 3 séances de salle, changer l'objectif). Ne régénère pas le programme : appeler generer_programme ensuite.",
    input: ParametresSport.partial(),
    output: ParametresSport,
  },

  generer_programme: {
    description:
      "Génère un programme complet (N semaines, blocs de 4 : progression puis décharge) à partir des paramètres et de la bibliothèque d'exercices. Remplace le programme actif : ses séances futures non faites sont supprimées. Action lourde → confirmer avec l'utilisateur avant.",
    input: z.object({
      debut: z.string().date().optional().describe("Premier jour (lundi conseillé). Par défaut : lundi prochain."),
      parametres: ParametresSport.partial().optional().describe("Surcharges ponctuelles ; sinon les réglages enregistrés."),
    }),
    output: z.object({
      programme_id: z.string().uuid(), nb_seances: z.number(), nb_exercices: z.number(), debut: z.string(), fin: z.string(),
      avertissements: z.array(z.string()),
    }),
  },

  seance_du_jour: {
    description: "La séance prévue pour un jour (aujourd'hui par défaut) avec ses exercices, prescriptions, kcal prévues et cochées.",
    input: z.object({ jour: z.string().date().optional() }),
    output: z.object({ jour: z.string().date(), seance: SeanceSortie.nullable() }),
  },

  cocher_exercice: {
    description: "Coche (ou décoche) un exercice d'une séance. Le premier coché démarre la séance ; les kcal de la séance sont recalculées.",
    input: z.object({ exercice_seance_id: z.string().uuid(), fait: z.boolean().default(true) }),
    output: z.object({ seance_id: z.string().uuid(), kcal: z.number() }),
  },

  terminer_seance: {
    description:
      "Termine une séance : les exercices restants sont comptés comme faits, la durée réelle est mesurée depuis le premier coché, les kcal sont figées (MET × poids actuel × durée). Ressenti 1–5 optionnel.",
    input: z.object({
      seance_id: z.string().uuid(),
      ressenti: z.number().int().min(1).max(5).optional(),
      notes: z.string().optional(),
    }),
    output: z.object({ seance_id: z.string().uuid(), kcal: z.number(), duree_min: z.number(), poids_utilise: z.number() }),
  },
} as const;

export type ToolName = keyof typeof tools;
export type ToolInput<T extends ToolName> = z.infer<(typeof tools)[T]["input"]>;
export type ToolOutput<T extends ToolName> = z.infer<(typeof tools)[T]["output"]>;

/** Outils dont l'exécution exige une confirmation explicite de l'utilisateur (actions irréversibles ou vers l'extérieur). */
export const toolsAvecConfirmation: ReadonlySet<string> = new Set([
  "generer_programme",
  // phase 1+ : "valider_courses", "envoyer_document", "creer_evenement"
]);
