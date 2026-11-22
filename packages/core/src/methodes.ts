/**
 * Méthodes d'entraînement de référence : chaque programme généré suit une méthode reconnue et sourcée, choisie selon
 * l'objectif et le niveau — pas des séries et des répétitions « au pif ». Le générateur (sport.ts) applique la
 * prescription de la méthode ; l'agent les liste (outil `lister_methodes`), peut en imposer une
 * (`parametres.methode`) et explique le choix. Décision : docs/decisions/0012-methodes-de-reference.md.
 *
 * Les méthodes sont réécrites ici d'après leurs publications (aucun fichier repris d'un autre projet).
 */
import { z } from "zod";

export const MethodeId = z.enum(["double_progression", "progression_lineaire", "cinq_trois_un", "seche", "endurance_musculaire"]);
export type MethodeId = z.infer<typeof MethodeId>;

export type PrescriptionMethode = { series: number; reps: string; repos_s: number };
export type ContexteMethode = {
  /** Semaine dans le bloc de 4 (1 à 3 ; la 4ᵉ, la décharge, est gérée par le générateur). */
  semaineDansBloc: number;
  /** Premier exercice de la séance : le mouvement principal. */
  principal: boolean;
  isolation: boolean;
};

export type Methode = {
  id: MethodeId;
  nom: string;
  /** Pour qui, en une phrase. */
  pour: string;
  /** Ce que la méthode prescrit, en une phrase. */
  resume: string;
  /** La règle de progression, à suivre séance après séance. */
  progression: string;
  objectifs: string[];
  niveaux: string[];
  sources: Array<{ titre: string; url: string }>;
  /** Prescription propre à la méthode ; `null` = prescription par blocs du générateur (hypertrophie / force / mixte). */
  prescrire: (c: ContexteMethode) => PrescriptionMethode | null;
  /** Consigne de la semaine, écrite dans les notes de la séance (facultatif). */
  consigne?: (semaineDansBloc: number) => string | null;
};

const ACSM_2026 = {
  titre: "ACSM, Position Stand 2026 — Resistance Training Prescription for Muscle Function, Hypertrophy, and Physical Performance",
  url: "https://acsm.org/resistance-training-guidelines-update-2026/",
};

export const METHODES: Record<MethodeId, Methode> = {
  double_progression: {
    id: "double_progression",
    nom: "Double progression",
    pour: "Prise de muscle et remise en forme, tous niveaux.",
    resume: "Une dizaine de séries par muscle et par semaine, entre 6 et 15 répétitions, en blocs de 4 semaines (3 de progression, 1 de décharge).",
    progression: "Garde la charge jusqu’à réussir le haut de la fourchette sur toutes les séries, puis ajoute la plus petite charge possible et repars du bas.",
    objectifs: ["hypertrophie"],
    niveaux: ["beginner", "intermediate", "advanced"],
    sources: [
      ACSM_2026,
      {
        titre: "Pelland et al. — méta-régression sur le volume et la fréquence d’entraînement (prépublication SportRxiv)",
        url: "https://sportrxiv.org/index.php/server/preprint/view/460",
      },
      {
        titre: "Schoenfeld, Ogborn & Krieger 2016 — Effects of Resistance Training Frequency on Measures of Muscle Hypertrophy (méta-analyse)",
        url: "https://pubmed.ncbi.nlm.nih.gov/27102172/",
      },
    ],
    prescrire: () => null,
  },
  progression_lineaire: {
    id: "progression_lineaire",
    nom: "Progression linéaire",
    pour: "Force, quand on débute : les charges montent à chaque séance.",
    resume: "3 séries de 5 sur les mouvements de base, 3 séries de 10 sur les accessoires, les mêmes mouvements répétés d’une semaine à l’autre.",
    progression: "Chaque séance réussie : +2,5 kg sur le haut du corps, +5 kg sur les jambes. Trois échecs de suite : −10 % et on remonte.",
    objectifs: ["force"],
    niveaux: ["beginner"],
    sources: [
      {
        titre: "Rippetoe, Starting Strength — progression linéaire du débutant (présentation : Barbell Logic)",
        url: "https://barbell-logic.com/starting-strength-novice-linear-progression/",
      },
      ACSM_2026,
    ],
    prescrire: (c) => (c.isolation ? { series: 3, reps: "10", repos_s: 75 } : { series: 3, reps: "5", repos_s: 150 }),
    consigne: () => "Progression linéaire : si toutes les séries passent, ajoute 2,5 kg (haut du corps) ou 5 kg (jambes) à la prochaine séance.",
  },
  cinq_trois_un: {
    id: "cinq_trois_un",
    nom: "5/3/1",
    pour: "Force, niveau intermédiaire ou avancé : des vagues de 3 semaines sur le mouvement principal.",
    resume:
      "Mouvement principal en vagues (semaine 1 : 3×5, semaine 2 : 3×3, semaine 3 : 5, 3 puis 1 répétition), les autres exercices en 3×8-10, puis une semaine de décharge.",
    progression:
      "Charges calculées sur 90 % de ton max. La dernière série se pousse au maximum de répétitions propres. À chaque nouveau bloc : +2,5 kg sur le haut du corps, +5 kg sur les jambes.",
    objectifs: ["force"],
    niveaux: ["intermediate", "advanced"],
    sources: [
      {
        titre: "Wendler, 5/3/1 — The Simplest and Most Effective Training System for Raw Strength (résumé : The Fitness Wiki)",
        url: "https://thefitness.wiki/5-3-1-primer/",
      },
      ACSM_2026,
    ],
    prescrire: (c) => {
      if (c.isolation) return { series: 3, reps: "10-12", repos_s: 75 };
      if (!c.principal) return { series: 3, reps: "8-10", repos_s: 120 };
      return [
        { series: 3, reps: "5", repos_s: 180 },
        { series: 3, reps: "3", repos_s: 180 },
        { series: 3, reps: "5-3-1", repos_s: 180 },
      ][Math.min(2, Math.max(0, c.semaineDansBloc - 1))];
    },
    consigne: (s) =>
      [
        "5/3/1 · semaine 1 : mouvement principal à 65, 75 puis 85 % de ton max d’entraînement, 5 répétitions (la dernière série au maximum).",
        "5/3/1 · semaine 2 : mouvement principal à 70, 80 puis 90 %, 3 répétitions (la dernière série au maximum).",
        "5/3/1 · semaine 3 : mouvement principal à 75 % × 5, 85 % × 3, 95 % × 1 ou plus.",
      ][s - 1] ?? null,
  },
  seche: {
    id: "seche",
    nom: "Sèche, charges maintenues",
    pour: "Perte de gras : garder le muscle pendant le déficit.",
    resume: "Même travail lourd qu’en prise de muscle (les charges ne baissent pas), plus 8 minutes de cardio continu en fin de séance.",
    progression:
      "L’objectif est de tenir tes charges. Si elles tiennent 2 semaines, tente +1 répétition ; le déficit se règle dans l’assiette, pas en allégeant les barres.",
    objectifs: ["perte_de_gras"],
    niveaux: ["beginner", "intermediate", "advanced"],
    sources: [
      {
        titre:
          "Helms, Aragon & Fitschen 2014 — Evidence-based recommendations for natural bodybuilding contest preparation: nutrition (rythme de perte, protéines sur la masse maigre)",
        url: "https://pubmed.ncbi.nlm.nih.gov/24864135/",
      },
      ACSM_2026,
    ],
    prescrire: () => null,
  },
  endurance_musculaire: {
    id: "endurance_musculaire",
    nom: "Endurance musculaire",
    pour: "Tenir l’effort plus longtemps : séries longues, repos courts.",
    resume: "3 séries de 15 répétitions avec 45 secondes de repos, une série de plus en semaine 3.",
    progression: "Quand les 15 répétitions passent sur toutes les séries, ajoute la plus petite charge possible ou enlève 5 secondes de repos.",
    objectifs: ["endurance"],
    niveaux: ["beginner", "intermediate", "advanced"],
    sources: [ACSM_2026],
    prescrire: () => null,
  },
};

/**
 * La méthode d'un programme : celle demandée si elle existe, sinon celle qui correspond à l'objectif et au niveau
 * (force débutant → progression linéaire ; force confirmé → 5/3/1 ; sèche ; endurance ; sinon double progression).
 */
export function choisirMethode(p: { objectif: string; niveau: string; methode?: MethodeId | null }): Methode {
  if (p.methode && METHODES[p.methode]) return METHODES[p.methode];
  if (p.objectif === "force") return p.niveau === "beginner" ? METHODES.progression_lineaire : METHODES.cinq_trois_un;
  if (p.objectif === "perte_de_gras") return METHODES.seche;
  if (p.objectif === "endurance") return METHODES.endurance_musculaire;
  return METHODES.double_progression;
}

/** La méthode sans ses fonctions, pour l'écran et l'agent. */
export function decrireMethode(m: Methode) {
  return {
    id: m.id,
    nom: m.nom,
    pour: m.pour,
    resume: m.resume,
    progression: m.progression,
    objectifs: m.objectifs,
    niveaux: m.niveaux,
    sources: m.sources,
  };
}
