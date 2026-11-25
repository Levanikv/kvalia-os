/**
 * Contrat des outils MCP (v0 — phase 0 : 5 outils).
 * Chaque outil = nom + description + schéma d'entrée + schéma de sortie.
 * Le serveur MCP (apps/agent) et l'API (apps/web) consomment ce fichier ; personne ne redéfinit ces types ailleurs.
 */
import { z } from "zod";
import { Ligne, Priorite, Tache, VueJour } from "./schemas";
import { ModeleSeanceEntree, ModificationProgramme, ParametresSport } from "./sport";
import { DefiEntree, MesureDefi, ModificationDefi, NotationDefi } from "./defis";
import { MethodeId } from "./methodes";
import { AlimentSortie } from "./aliments";
import { EntreeJournal, EntreeRepeterRepas, Repas } from "./nutrition";
import { EntreePhotoRepas, SortiePhotoRepas } from "./photo";

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

const SortieConnexionTiime = z.object({
  statut: z.enum(["connecte", "code_requis"]),
  methode: z.string().nullable(),
  attend_code: z.boolean().describe("Vrai : demander un code ; faux : faire valider la notification dans l'app Tiime"),
  message: z.string(),
});

const DefiSortie = z.object({
  id: z.string().uuid(),
  nom: z.string(),
  mesure: MesureDefi,
  cible: z.number(),
  jours_semaine: z.array(z.number()),
  libelle_jours: z.string(),
  debut: z.string(),
  fin: z.string().nullable(),
});

const RecetteSortie = z.object({
  id: z.string().uuid(),
  nom: z.string(),
  repas: z.array(z.string()),
  tags: z.array(z.string()),
  temps_min: z.number().nullable(),
  kcal: z.number().describe("par portion"),
  prot: z.number(),
  gluc: z.number(),
  lip: z.number(),
  fibres: z.number().nullable(),
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
      "Modifie un ou plusieurs paramètres du programme sportif (ex. passer à 3 séances de salle, changer l'objectif). Accepte aussi `profil` (réponses de l'onboarding : sexe, âge, taille, poids, objectifs, jours, durée, lieu, matériel, échéance, niveau, douleurs, choix nutrition, `preference_materiel` : mix / poids_libres / machines / poulies, `morpho` : mince / athletique / costaud / rond) — il est fusionné au profil existant et recalcule rythme, jours, durée, objectif, niveau, semaines et matériel ; si le choix nutrition est « ia » ou « saisie », la cible kcal et les protéines suivent. `onboarding` mémorise l'étape où reprendre. Ne régénère pas le programme : appeler generer_programme ensuite.",
    input: ParametresSport.partial(),
    output: ParametresSport,
  },

  generer_programme: {
    description:
      "Génère un programme complet (N semaines, blocs de 4 : progression puis décharge) à partir des paramètres et de la bibliothèque d'exercices, en suivant une méthode de référence choisie selon l'objectif et le niveau (voir lister_methodes ; `parametres.methode` en impose une). Les règles suivent les recommandations actuelles (une dizaine de séries par muscle et par semaine, charges progressives ; poids libres et machines se valent, donc le matériel préféré du profil oriente le choix ; la morphologie et les douleurs écartent les exercices mal adaptés) — avant de générer pour quelqu'un dont on ne connaît ni le matériel préféré ni la morphologie, les demander et les enregistrer avec regler_sport (profil). Remplace le programme actif à partir du premier jour (`debut`) : l'ancien s'arrête la veille, ses séances non faites (prévues, sautées, en cours) à partir de cette date sont remplacées — y compris celle du jour si debut = aujourd'hui ; avant cette date il continue ; les séances faites restent et ne sont pas doublées. Action lourde → confirmer avec l'utilisateur avant.",
    input: z.object({
      debut: z
        .string()
        .date()
        .optional()
        .describe(
          "Premier jour souhaité (aujourd'hui possible). Un programme commence toujours un jour de séance : si ce jour n'en est pas un, le début passe au prochain jour de séance. Par défaut : le prochain jour de séance à partir de demain. Les séances de l'ancien programme sont remplacées à partir de ce jour.",
        ),
      parametres: ParametresSport.partial().optional().describe("Surcharges ponctuelles ; sinon les réglages enregistrés."),
    }),
    output: z.object({
      programme_id: z.string().uuid(),
      nb_seances: z.number(),
      nb_exercices: z.number(),
      debut: z.string(),
      fin: z.string(),
      methode: z.string().describe("Nom de la méthode suivie ; détail et sources par lister_methodes"),
      avertissements: z.array(z.string()),
    }),
  },

  lister_methodes: {
    description:
      "Les méthodes d'entraînement de référence sur lesquelles les programmes sont construits (double progression, progression linéaire, 5/3/1, sèche charges maintenues, endurance musculaire) : pour qui, ce qu'elles prescrivent, la règle de progression et leurs sources. `recommandee` = celle que le générateur prendrait pour le profil actuel (objectif + niveau). À appeler avant generer_programme pour expliquer le choix, ou pour en imposer une autre via parametres.methode si l'utilisateur le demande.",
    input: z.object({}),
    output: z.object({
      recommandee: MethodeId,
      methodes: z.array(
        z.object({
          id: MethodeId,
          nom: z.string(),
          pour: z.string(),
          resume: z.string(),
          progression: z.string(),
          objectifs: z.array(z.string()),
          niveaux: z.array(z.string()),
          sources: z.array(z.object({ titre: z.string(), url: z.string() })),
        }),
      ),
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

  demarrer_seance: {
    description:
      "Démarre une séance (« je commence ma séance ») : lance le chrono sans rien cocher. Sans effet si elle tourne déjà ou est faite. Ensuite : valider_serie au fil des séries, terminer_seance à la fin.",
    input: z.object({ seance_id: z.string().uuid() }),
    output: z.object({ seance_id: z.string().uuid(), etat: z.string(), debut_le: z.string().nullable() }),
  },

  chrono_seance: {
    description: "Met en pause ou relance le chrono d'une séance en cours (le temps de pause n'est pas compté dans la durée ni les kcal).",
    input: z.object({ seance_id: z.string().uuid(), action: z.enum(["pause", "reprendre"]) }),
    output: z.object({ seance_id: z.string().uuid(), en_pause: z.boolean(), chrono_s: z.number() }),
  },

  valider_serie: {
    description:
      "Valide la série suivante d'un exercice de la séance (reps et charge réellement faites ; sinon la prescription). La première série démarre la séance ; la dernière coche l'exercice et recalcule les kcal.",
    input: z.object({
      exercice_seance_id: z.string().uuid(),
      reps: z.number().int().min(0).max(200).nullable().optional(),
      charge_kg: z.number().min(0).max(500).nullable().optional(),
    }),
    output: z.object({
      seance_id: z.string().uuid(),
      series_faites: z.number(),
      series: z.number(),
      exercice_fait: z.boolean(),
      kcal: z.number().nullable(),
    }),
  },

  terminer_seance: {
    description:
      "Termine une séance : les exercices restants sont comptés comme faits, sauf ceux passés dans `rates` (exercices_seance ids), qui sont reprogrammés en fin de la prochaine séance prévue du programme. Durée réelle = chrono, pauses déduites ; kcal figées (MET × poids actuel × durée). Ressenti 1–5 optionnel. Demande d'abord s'il y a des exercices ratés quand tout n'est pas coché.",
    input: z.object({
      seance_id: z.string().uuid(),
      ressenti: z.number().int().min(1).max(5).optional(),
      notes: z.string().optional(),
      rates: z.array(z.string().uuid()).default([]),
    }),
    output: z.object({
      seance_id: z.string().uuid(),
      kcal: z.number(),
      duree_min: z.number(),
      poids_utilise: z.number(),
      rates: z.array(
        z.object({
          exercice_seance_id: z.string().uuid(),
          exercice_id: z.string(),
          reprogramme: z.object({ seance_id: z.string().uuid(), jour: z.string(), titre: z.string().nullable() }).nullable(),
        }),
      ),
    }),
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
      "Propose des exercices équivalents (même muscle cible, matériel disponible, même nature) pour remplacer un exercice d'une séance — machine prise, douleur, envie de varier. Les classiques (simples à installer) sortent en premier : proposer ceux-là d'abord.",
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
        image_url: z.string().nullable(),
        video_url: z.string().nullable(),
      }),
    ),
  },

  remplacer_exercice: {
    description:
      "Remplace un exercice d'une séance par un autre (id du référentiel, voir equivalents_exercice). portee = « seance » (cette séance seulement) ou « programme » (toutes les séances à venir du programme qui contiennent cet exercice). Demander la portée à l'utilisateur si elle n'est pas dite.",
    input: z.object({ exercice_seance_id: z.string().uuid(), nouvel_exercice_id: z.string(), portee: z.enum(["seance", "programme"]).default("seance") }),
    output: z.object({ remplaces: z.number(), ancien: z.string(), nouveau: z.string(), nom: z.string(), portee: z.enum(["seance", "programme"]) }),
  },

  // ---------- Mes séances (séances perso) et modifier le programme ----------
  lister_seances_perso: {
    description:
      "Liste les séances personnalisées de l'utilisateur (« Mes séances ») : nom, type, exercices (id du référentiel, séries, reps, repos, charge), et les jours de la semaine où elles sont posées dans le programme.",
    input: z.object({}),
    output: z.array(
      z.object({
        id: z.string().uuid(),
        nom: z.string(),
        type: z.string(),
        notes: z.string().nullable(),
        jours_semaine: z.array(z.number()),
        exercices: z.array(z.object({ exercice_id: z.string(), series: z.number(), reps: z.string(), repos_s: z.number(), charge_kg: z.number().nullable() })),
      }),
    ),
  },

  creer_seance_perso: {
    description:
      "Crée une séance personnalisée réutilisable (« Mes séances ») : nom, type (full, upper, lower, push, pull, legs, hiit, cardio, maison) et exercices du référentiel dans l'ordre (séries, reps, repos en s, charge facultative). Rester simple et efficace : 5 à 6 exercices classiques, faciles à installer (développé couché, rowing, tirage vertical, squat ou presse, soulevé de terre jambes tendues, curl, extension à la poulie…), gros mouvements d'abord ; pas de variantes exotiques (ballon, à un bras, à genoux, à plat ventre sur banc incliné) sauf demande explicite. Elle n'est pas planifiée : pour la mettre au programme, appeler planifier_seance_perso.",
    input: ModeleSeanceEntree,
    output: z.object({ id: z.string().uuid(), nom: z.string(), nb_exercices: z.number(), duree_min: z.number() }),
  },

  modifier_seance_perso: {
    description:
      "Modifie une séance personnalisée (remplace nom, type et toute la liste d'exercices). Ses séances déjà planifiées à venir et non faites sont mises à jour ; l'historique ne bouge pas.",
    input: ModeleSeanceEntree.extend({ id: z.string().uuid() }),
    output: z.object({ id: z.string().uuid(), nom: z.string(), nb_exercices: z.number(), seances_mises_a_jour: z.number() }),
  },

  supprimer_seance_perso: {
    description:
      "Supprime une séance personnalisée. Si elle était posée sur un jour de la semaine du programme, ce jour repasse en séance générée à partir d'aujourd'hui. Confirmer avant.",
    input: z.object({ id: z.string().uuid() }),
    output: z.object({ id: z.string().uuid(), supprime: z.boolean() }),
  },

  planifier_seance_perso: {
    description:
      "Met une séance personnalisée au planning : soit chaque semaine un jour donné (jour_semaine 0 = dimanche … 6 = samedi) à partir d'a_partir_de (aujourd'hui par défaut) dans le programme actif — elle remplace la séance générée ce jour-là ; soit une seule fois à une date (remplace la séance de salle non faite prévue ce jour). Demander « chaque semaine ou une fois ? » si ce n'est pas dit.",
    input: z.object({
      modele_id: z.string().uuid(),
      jour_semaine: z.number().int().min(0).max(6).optional(),
      date: z.string().date().optional(),
      a_partir_de: z.string().date().optional(),
    }),
    output: z.object({
      mode: z.enum(["chaque_semaine", "une_fois"]),
      jour_semaine: z.number().optional(),
      nb_seances: z.number().optional(),
      depuis: z.string().optional(),
      seance_id: z.string().uuid().optional(),
      jour: z.string().optional(),
      remplace: z.number().optional(),
    }),
  },

  modifier_programme: {
    description:
      "Modifie le programme actif sans en créer un nouveau : jours de salle (0 = dimanche … 6 = samedi), durée des séances, nombre de semaines (la fin suit), séances perso posées par jour de semaine. Les séances non démarrées à partir d'a_partir_de (aujourd'hui par défaut, jamais avant) sont reposées ; semaines, blocs et phases restent ceux du programme ; faites et en cours ne bougent pas. Pour changer d'objectif, c'est generer_programme. Confirmer avant.",
    input: ModificationProgramme,
    output: z.object({ programme_id: z.string().uuid(), depuis: z.string(), fin: z.string(), nb_seances: z.number(), avertissements: z.array(z.string()) }),
  },

  reinitialiser_sport: {
    description:
      "TEMPORAIRE (tests v0) : remet l'app Sport à zéro — supprime programmes, séances, séances perso, défis, réglages et onboarding Sport (pas les pesées ni la nutrition). Irréversible : ne l'appeler que si Levani le demande explicitement, après confirmation.",
    input: z.object({ confirmer: z.literal(true) }),
    output: z.object({ supprime: z.object({ seances: z.number(), programmes: z.number(), seances_perso: z.number(), defis: z.number() }) }),
  },

  // ---------- Défis du programme (pas, minutes, répétitions, case à cocher) ----------
  lister_defis: {
    description:
      "Liste les défis de l'utilisateur (ex. 10 000 pas par jour, 10 min de mobilité, 50 pompes, une case « pas de sucre ») et leur état pour un jour (aujourd'hui par défaut) : valeur notée, cible atteinte, série de jours tenus, bilan de la semaine. du_jour = le défi vaut ce jour-là.",
    input: z.object({ jour: z.string().date().optional().describe("YYYY-MM-DD (aujourd'hui par défaut)") }),
    output: z.array(
      DefiSortie.extend({
        actif: z.boolean(),
        du_jour: z.boolean(),
        termine: z.boolean(),
        a_venir: z.boolean(),
        unite: z.string(),
        valeur: z.number(),
        atteint: z.boolean(),
        serie: z.number(),
        semaine: z.object({ atteints: z.number(), total: z.number() }),
      }),
    ),
  },

  creer_defi: {
    description:
      "Ajoute un défi au programme : un nom, une mesure (pas, minutes, repetitions, ou case pour juste cocher), une cible par jour, les jours de la semaine (tous par défaut). Il commence aujourd'hui et s'arrête à la fin du programme actif, sauf dates données. Demander la cible si elle n'est pas claire.",
    input: DefiEntree,
    output: DefiSortie,
  },

  modifier_defi: {
    description:
      "Modifie un défi (nom, mesure, cible, jours, dates) ou le met en pause (actif=false) / le relance (actif=true). L'historique déjà noté ne bouge pas.",
    input: ModificationDefi,
    output: DefiSortie.extend({ actif: z.boolean() }),
  },

  noter_defi: {
    description:
      "Note la progression d'un défi pour un jour (aujourd'hui par défaut, jamais dans le futur) : « j'ai fait 8 500 pas » → valeur=8500 ; « +10 min de gainage » → ajouter=10 ; « défi pas de sucre tenu » → fait=true. Appeler lister_defis d'abord pour trouver l'id.",
    input: NotationDefi,
    output: z.object({ defi_id: z.string().uuid(), nom: z.string(), jour: z.string(), valeur: z.number(), cible: z.number(), atteint: z.boolean() }),
  },

  supprimer_defi: {
    description:
      "Supprime un défi et tout son historique. Irréversible : pour simplement l'arrêter en gardant l'historique, préférer modifier_defi avec actif=false. Confirmer avant.",
    input: z.object({ id: z.string().uuid() }),
    output: z.object({ id: z.string().uuid(), supprime: z.boolean() }),
  },

  // ---------- Nutrition : aliments, journal, recettes, suggestions ----------
  chercher_aliment: {
    description:
      "Cherche un aliment dans la base (3 000 aliments génériques de la table CIQUAL de l'ANSES + produits de marque d'Open Food Facts) par nom (« skyr », « riz basmati cuit ») ou par code-barres. Rend les valeurs pour 100 g et la portion usuelle. À appeler avant ajouter_au_journal pour obtenir l'aliment_id.",
    input: z.object({
      requete: z.string().trim().min(2).max(80).describe("Nom de l'aliment ou code-barres (8 à 14 chiffres)"),
      distant: z.boolean().default(true).describe("Interroger aussi Open Food Facts (produits de marque)"),
    }),
    output: z.object({ aliments: z.array(AlimentSortie), open_food_facts: z.enum(["consulte", "ignore", "indisponible"]) }),
  },

  journal_du_jour: {
    description:
      "Le journal alimentaire d'un jour (aujourd'hui par défaut) : cible kcal (base + sport), mangé, reste, protéines / glucides / lipides et leurs cibles, puis les lignes par repas (petit-déjeuner, collation, déjeuner, encas, dîner).",
    input: z.object({ jour: z.string().date().optional() }),
    output: z.object({
      jour: z.string(),
      base: z.number(),
      brule: z.number(),
      cible: z.number(),
      consomme: z.number(),
      reste: z.number(),
      proteines: z.number(),
      proteines_cible: z.number(),
      glucides: z.number(),
      lipides: z.number(),
      macros_cible: z.object({ prot: z.number(), gluc: z.number(), lip: z.number() }),
      repas: z.array(
        z.object({
          repas: Repas,
          libelle: z.string(),
          kcal: z.number(),
          lignes: z.array(
            z.object({
              id: z.string().uuid(),
              libelle: z.string(),
              kcal: z.number(),
              prot: z.number(),
              gluc: z.number(),
              lip: z.number(),
              quantite_g: z.number().nullable(),
              portions: z.number(),
            }),
          ),
        }),
      ),
    }),
  },

  ajouter_au_journal: {
    description:
      "Note quelque chose de mangé : un aliment de la base (aliment_id de chercher_aliment + quantite_g), une recette (recette_id + portions) ou une saisie libre (libelle + kcal, et si possible prot / gluc / lip). Sans repas précisé, c'est le repas du moment. « J'ai mangé 150 g de skyr » → chercher_aliment puis cet outil.",
    input: EntreeJournal,
    output: z.object({
      id: z.string().uuid(),
      jour: z.string(),
      repas: Repas,
      libelle: z.string(),
      kcal: z.number(),
      prot: z.number(),
      gluc: z.number(),
      lip: z.number(),
    }),
  },

  supprimer_du_journal: {
    description: "Retire une ligne du journal alimentaire (id donné par journal_du_jour).",
    input: z.object({ id: z.string().uuid() }),
    output: z.object({ id: z.string().uuid(), supprime: z.boolean() }),
  },

  estimer_repas_photo: {
    description:
      "Estime un repas à partir de sa photo : les aliments de l'assiette, leur poids, leurs calories et leurs macros, avec un niveau de confiance. Ne note rien : après ajustement, chaque élément se note avec ajouter_au_journal (libelle + kcal + prot / gluc / lip). `precision` sert à dire ce que la photo ne montre pas (« cuit à l'huile », « riz complet »).",
    input: EntreePhotoRepas,
    output: SortiePhotoRepas,
  },

  repeter_repas: {
    description:
      "Refait un repas à l'identique : recopie dans le journal du jour (aujourd'hui par défaut) ce qui avait été noté à ce repas la dernière fois, ou le jour `depuis`. « Même petit-déjeuner qu'hier » → cet outil.",
    input: EntreeRepeterRepas,
    output: z.object({ jour: z.string(), repas: Repas, depuis: z.string(), lignes: z.number(), kcal: z.number() }),
  },

  lister_recettes: {
    description:
      "Les recettes avec leurs macros par portion, les repas où elles ont leur place et leurs étiquettes (riche_proteines, avant_seance, apres_seance, seche, masse, leger, rapide, vegetarien, batch). Filtrable par repas.",
    input: z.object({ repas: Repas.optional() }),
    output: z.array(RecetteSortie),
  },

  suggerer_repas: {
    description:
      "« Il me reste 300 kcal, je mange quoi ? » : pour un repas (celui du moment par défaut), calcule le budget de calories à partir de ce qu'il reste aujourd'hui et propose les recettes les mieux adaptées — au plus près du budget, en comblant les protéines manquantes, et selon le sport (glucides avant la séance, protéines après, léger en sèche, dense en prise de muscle). `budget_kcal` impose un budget précis.",
    input: z.object({ jour: z.string().date().optional(), repas: Repas.optional(), budget_kcal: z.number().int().min(50).max(2000).optional() }),
    output: z.object({
      jour: z.string(),
      repas: Repas,
      libelle_repas: z.string(),
      reste_kcal: z.number(),
      reste_proteines: z.number(),
      budget_kcal: z.number(),
      sport: z.object({ objectif: z.string().nullable(), seance_a_venir: z.boolean(), seance_faite: z.boolean() }),
      message: z.string(),
      suggestions: z.array(RecetteSortie.extend({ portions: z.number(), raison: z.string() })),
    }),
  },

  // ---------- Entreprise (SASU) — Tiime en lecture seule, ADR 0010 ----------
  connecter_tiime: {
    description:
      "Connecte l'agent au compte Tiime de la SASU. À utiliser quand une synchro Tiime échoue faute de connexion (« connexion requise », jeton expiré) ou quand Levani demande de (re)connecter Tiime. Tiime demande alors une vérification : si `attend_code` est faux, c'est une notification dans l'app Tiime sur l'iPhone — demander à Levani de la valider puis appeler valider_code_tiime sans code ; si `attend_code` est vrai, demander le code reçu (SMS, e-mail) puis appeler valider_code_tiime avec. Ne jamais demander son mot de passe.",
    input: z.object({
      methode: z.enum(["push", "sms", "email"]).optional().describe("Méthode de vérification ; par défaut celle que Tiime propose (notification dans l'app)"),
    }),
    output: SortieConnexionTiime,
  },

  valider_code_tiime: {
    description:
      "Termine la connexion Tiime lancée par connecter_tiime : avec le code reçu (SMS, e-mail), ou sans code une fois la notification validée dans l'app Tiime. Si la réponse est encore `code_requis`, le code était faux ou la notification pas encore validée : redemander à Levani.",
    input: z.object({
      code: z
        .string()
        .regex(/^\d{4,8}$/, "code à 4-8 chiffres")
        .optional()
        .describe("Code de vérification reçu par Levani ; vide pour une notification validée dans l'app"),
    }),
    output: SortieConnexionTiime,
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
  "modifier_programme",
  "supprimer_seance_perso",
  "supprimer_defi",
  "reinitialiser_sport",
  // phase 1+ : "valider_courses", "envoyer_document", "creer_evenement"
]);
