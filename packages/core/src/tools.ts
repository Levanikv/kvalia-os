/**
 * Contrat des outils MCP (v0 — phase 0 : 5 outils).
 * Chaque outil = nom + description + schéma d'entrée + schéma de sortie.
 * Le serveur MCP (apps/agent) et l'API (apps/web) consomment ce fichier ; personne ne redéfinit ces types ailleurs.
 */
import { z } from "zod";
import { Ligne, Priorite, Tache, VueJour } from "./schemas";

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
} as const;

export type ToolName = keyof typeof tools;
export type ToolInput<T extends ToolName> = z.infer<(typeof tools)[T]["input"]>;
export type ToolOutput<T extends ToolName> = z.infer<(typeof tools)[T]["output"]>;

/** Outils dont l'exécution exige une confirmation explicite de l'utilisateur (actions irréversibles ou vers l'extérieur). */
export const toolsAvecConfirmation: ReadonlySet<string> = new Set([
  // phase 1+ : "valider_courses", "envoyer_document", "creer_evenement"
]);
