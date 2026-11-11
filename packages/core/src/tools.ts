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
    description: "Ajoute un ou plusieurs articles à la liste de courses active. Crée le produit s'il n'existe pas. Fusionne les doublons (quantité cumulée).",
    input: z.object({
      articles: z
        .array(
          z.object({
            nom: z.string().min(1).describe("Nom du produit, ex. « skyr »"),
            quantite: z.number().positive().default(1),
            unite: z.string().optional(),
          }),
        )
        .min(1),
      origine: z.enum(["agent", "siri", "alexa", "telegram", "manuel"]).default("agent"),
    }),
    output: z.object({ liste_id: z.string().uuid(), lignes: z.array(Ligne) }),
  },

  liste_actuelle: {
    description: "Renvoie la liste de courses active, groupée par rayon, avec les manques signalés.",
    input: z.object({}),
    output: z.object({
      liste_id: z.string().uuid().nullable(),
      rayons: z.array(
        z.object({
          rayon: z.string().nullable(),
          lignes: z.array(Ligne.extend({ produit: z.string() })),
        }),
      ),
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
    description: "Le condensé du jour : rendez-vous, séance, repas, tâches, habitudes, courses, dépenses de la semaine, alertes. Même données que la Home.",
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
      programme_id: z.string().uuid(),
      nb_seances: z.number(),
      nb_exercices: z.number(),
      debut: z.string(),
      fin: z.string(),
      avertissements: z.array(z.string()),
    }),
  },

  seance_du_jour: {
    description:
      "Les séances prévues pour un jour (aujourd'hui par défaut) avec leurs exercices, prescriptions, kcal prévues et cochées. Un jour peut avoir deux séances (ex. muscu + boxe) : `seances` les liste toutes (salle d'abord) ; `seance` est la principale (la première pas encore faite).",
    input: z.object({ jour: z.string().date().optional() }),
    output: z.object({ jour: z.string().date(), seance: SeanceSortie.nullable(), seances: z.array(SeanceSortie) }),
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

  noter_charge: {
    description:
      "Note la charge soulevée (kg) et/ou les reps réalisées sur un exercice d'une séance. Sert aux graphes de progression et au pré-remplissage des séances suivantes.",
    input: z.object({
      exercice_seance_id: z.string().uuid(),
      charge_kg: z.number().min(0).max(500).nullable().optional(),
      reps_faites: z.number().int().min(0).max(200).nullable().optional(),
      note: z.string().max(200).nullable().optional(),
    }),
    output: z.object({
      id: z.string().uuid(),
      exercice_id: z.string(),
      seance_id: z.string().uuid(),
      charge_kg: z.number().nullable(),
      realise: z.object({ reps_faites: z.number().optional(), note: z.string().optional() }),
    }),
  },

  historique_exercice: {
    description: "Les charges notées sur un exercice (référentiel), de la plus récente à la plus ancienne.",
    input: z.object({ exercice_id: z.string(), limite: z.number().int().min(1).max(50).default(12) }),
    output: z.array(
      z.object({
        id: z.string().uuid(),
        seance_id: z.string().uuid(),
        jour: z.string(),
        titre: z.string().nullable(),
        charge_kg: z.number(),
        series: z.number(),
        reps: z.string(),
        reps_faites: z.number().nullable(),
        fait: z.boolean(),
      }),
    ),
  },

  equivalents_exercice: {
    description:
      "Propose des exercices équivalents (même muscle cible, matériel disponible, même nature) pour remplacer un exercice d'une séance — machine prise, douleur, envie de varier.",
    input: z.object({ exercice_seance_id: z.string().uuid(), limite: z.number().int().min(1).max(20).default(8) }),
    output: z.array(
      z.object({
        id: z.string(),
        nom: z.string(),
        nom_fr: z.string().nullable(),
        partie_corps: z.string().nullable(),
        equipement: z.string().nullable(),
        compose: z.boolean(),
        raison: z.string(),
        score: z.number(),
      }),
    ),
  },

  remplacer_exercice: {
    description:
      "Remplace un exercice d'une séance par un autre (id du référentiel, voir equivalents_exercice). portee = « seance » (cette séance seulement) ou « programme » (toutes les séances à venir du programme qui contiennent cet exercice). Demander la portée à l'utilisateur si elle n'est pas dite.",
    input: z.object({ exercice_seance_id: z.string().uuid(), nouvel_exercice_id: z.string(), portee: z.enum(["seance", "programme"]).default("seance") }),
    output: z.object({ remplaces: z.number(), ancien: z.string(), nouveau: z.string(), nom: z.string(), portee: z.enum(["seance", "programme"]) }),
  },

  // ---------- Entreprise (SASU) — Tiime en lecture seule, ADR 0010 ----------
  connecter_tiime: {
    description:
      "Connecte l'agent au compte Tiime de la SASU. À utiliser quand une synchro Tiime échoue faute de connexion (« connexion requise », jeton expiré) ou quand Levani demande de (re)connecter Tiime. Tiime envoie alors un code par SMS à Levani : lui demander ce code, puis appeler valider_code_tiime. Ne jamais demander son mot de passe.",
    input: z.object({ methode: z.enum(["sms", "email"]).default("sms").describe("Canal du code de vérification ; sms par défaut") }),
    output: z.object({ statut: z.enum(["connecte", "code_requis"]), methode: z.string().nullable(), message: z.string() }),
  },

  valider_code_tiime: {
    description:
      "Termine la connexion Tiime lancée par connecter_tiime avec le code reçu par SMS (ou e-mail). Si Tiime refuse le code, redemander le code à Levani.",
    input: z.object({
      code: z
        .string()
        .regex(/^\d{4,8}$/, "code à 4-8 chiffres")
        .describe("Code de vérification reçu par Levani"),
    }),
    output: z.object({ statut: z.enum(["connecte", "code_requis"]), methode: z.string().nullable(), message: z.string() }),
  },

  synchroniser_tiime: {
    description:
      "Rapatrie depuis Tiime (lecture seule, rien n'est modifié dans Tiime) : compte pro et ses transactions, factures émises avec leur statut, notes de frais, trajets d'indemnités kilométriques. À appeler avant de répondre sur les chiffres de la SASU si la dernière synchro date de plus d'un jour, ou quand Levani le demande. Sans `depuis`, reprend depuis la dernière synchro (ou le 1er janvier de l'année précédente la première fois).",
    input: z.object({ depuis: z.string().date().optional().describe("Date de départ des transactions (YYYY-MM-DD)") }),
    output: z.object({
      depuis: z.string(),
      comptes: z.number(),
      transactions: z.number(),
      factures: z.number(),
      notes_frais: z.number(),
      trajets: z.number(),
      avertissements: z.array(z.string()),
    }),
  },

  pilotage_sasu: {
    description:
      "Chiffres de la SASU sur une année à partir des données Tiime synchronisées : CA facturé (HT/TTC), encaissé, factures en attente, solde et flux du compte pro, dépenses sans justificatif, notes de frais (dont à rembourser), indemnités kilométriques. Regarder `derniere_sync` : si elle est ancienne, proposer synchroniser_tiime. Rappeler que ce n'est pas un avis comptable.",
    input: z.object({ annee: z.number().int().min(2000).max(2100).optional().describe("Année civile ; par défaut l'année en cours") }),
    output: z.object({
      annee: z.number(),
      derniere_sync: z.string().nullable(),
      factures: z.object({
        emises: z.number(),
        ca_facture_ht: z.number(),
        ca_facture_ttc: z.number(),
        payees: z.number(),
        encaisse_ttc: z.number(),
        en_attente: z.number(),
        en_attente_ttc: z.number(),
      }),
      banque: z.object({ solde: z.number().nullable(), entrees: z.number(), sorties: z.number(), operations: z.number(), sans_justificatif: z.number() }),
      notes_frais: z.object({ nombre: z.number(), montant: z.number(), a_rembourser: z.number() }),
      indemnites_km: z.object({ trajets: z.number(), km: z.number(), montant: z.number().nullable() }),
    }),
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
