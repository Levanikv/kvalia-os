import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PARAMETRES_SPORT_DEFAUT,
  ParametresSport,
  cocherExercice,
  equivalents,
  genererProgramme,
  kcalPour,
  phasesProgramme,
  planSemaine,
  seancesDuJour,
  trierSeancesDuJour,
  remplacerExercice,
  terminerSeance,
  peutDemarrer,
  parametresDepuisReponses,
  plagesPhases,
  reponsesDepuisParametres,
  chargerModeles,
  creerModeleSeance,
  modifierModeleSeance,
  modifierProgramme,
  planifierModeleSeance,
  supprimerModeleSeance,
  reinitialiserSport,
  joursDeSeance,
  premierJourSeance,
  chronoSecondes,
  chronoSeance,
  defiSemaine,
  demarrerSeance,
  exerciceEnCours,
  repsPrescrites,
  seriesFaites,
  validerSerie,
  volumeSeance,
  ciblesDepuisProfil,
  deconseille,
  masseMaigre,
  CLASSIQUES,
  simplicite,
} from "../src/sport";
import { METHODES, choisirMethode } from "../src/methodes";
import { executer } from "../src/actions";
import { USER, exercicesRef, fausseDb } from "./fausse-db";

const refs = exercicesRef();
const base = () => fausseDb({ exercices_ref: refs, programmes: [], seances: [], exercices_seance: [], pesees: [], profils: [{ id: USER, reglages: {} }] });

describe("kcalPour", () => {
  it("MET × poids × durée (h), arrondi", () => {
    expect(kcalPour(6, 80, 3600)).toBe(480);
    expect(kcalPour(5, 82, 390)).toBe(44);
  });
});

describe("ParametresSport", () => {
  it("a des valeurs par défaut cohérentes (4 salle + 1 boxe, 60 min, 12 semaines)", () => {
    expect(PARAMETRES_SPORT_DEFAUT.rythme).toEqual({ salle: 4, boxe: 1 });
    expect(PARAMETRES_SPORT_DEFAUT.duree_min).toBe(60);
    expect(PARAMETRES_SPORT_DEFAUT.semaines).toBe(12);
  });
  it("rejette un rythme impossible", () => {
    expect(ParametresSport.safeParse({ rythme: { salle: 9, boxe: 0 } }).success).toBe(false);
  });
});

describe("genererProgramme", () => {
  it("génère 12 semaines × (4 salle + 1 boxe) à partir d'un lundi, en blocs de 4", async () => {
    const db = base();
    const r = await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    expect(r.nb_seances).toBe(60);
    expect(r.debut).toBe("2026-11-09");
    expect(r.fin).toBe("2027-01-31");
    const seances = db.tables.seances;
    expect(seances.filter((s: any) => s.type === "boxe")).toHaveLength(12);
    expect(new Set(seances.map((s: any) => s.bloc))).toEqual(new Set([1, 2, 3]));
    expect(seances.filter((s: any) => s.semaine === 4).every((s: any) => s.focus === "deload")).toBe(true);
  });

  it("respecte la durée cible (+10 %) et ne répète pas un exercice dans une séance", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    for (const s of db.tables.seances.filter((x: any) => x.type !== "boxe")) {
      expect(s.duree_min).toBeLessThanOrEqual(66);
      const ids = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).map((e: any) => e.exercice_id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(ids.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("n'utilise que le matériel disponible", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, materiel: ["dumbbell", "body weight"], poids_kg: 80 }, "2026-11-09");
    const parId = new Map(refs.map((r) => [r.id, r]));
    for (const e of db.tables.exercices_seance) expect(["dumbbell", "body weight"]).toContain(parId.get(e.exercice_id)!.equipement);
  });

  it("un nouveau programme remplace l'ancien à partir de SA date de début : avant, l'ancien continue ; les faites restent", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
    try {
      const db = base();
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
      const premier = db.tables.programmes[0].id;
      const avantDebut = db.tables.seances.filter((s: any) => s.programme_id === premier && s.jour < "2026-11-23").map((s: any) => s.id);
      expect(avantDebut.some((id: string) => db.tables.seances.find((s: any) => s.id === id).jour > "2026-11-11")).toBe(true);
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 3, boxe: 0 }, jours_salle: [1, 3, 5], poids_kg: 80 }, "2026-11-23");
      const ancien = db.tables.programmes.find((p: any) => p.id === premier);
      expect(ancien.actif).toBe(false);
      expect(ancien.fin).toBe("2026-11-22");
      // L'ancien garde tout ce qui précède le 23 (même les séances à venir d'ici là) et rien après.
      const restantes = db.tables.seances.filter((s: any) => s.programme_id === premier).map((s: any) => s.id);
      expect(restantes.sort()).toEqual([...avantDebut].sort());
      expect(db.tables.programmes.filter((p: any) => p.actif)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("un programme qui démarre aujourd'hui écrase la séance du jour (même en cours) mais ne double pas une séance faite", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));
    try {
      const db = base();
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
      const premier = db.tables.programmes[0].id;
      const duJour = db.tables.seances.find((s: any) => s.jour === "2026-11-09" && s.type !== "boxe");
      await demarrerSeance(db, USER, duJour.id);
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
      expect(db.tables.seances.find((s: any) => s.id === duJour.id)).toBeUndefined();
      const nouvelles = db.tables.seances.filter((s: any) => s.jour === "2026-11-09" && s.type !== "boxe");
      expect(nouvelles).toHaveLength(1);
      expect(nouvelles[0].programme_id).not.toBe(premier);

      // Séance du jour terminée puis nouveau programme : elle reste, et aucune séance de salle n'est ajoutée ce jour-là.
      await terminerSeance(db, USER, nouvelles[0].id);
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
      const ceJour = db.tables.seances.filter((s: any) => s.jour === "2026-11-09" && s.type !== "boxe");
      expect(ceJour).toHaveLength(1);
      expect(ceJour[0].etat).toBe("faite");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("suivi d'une séance", () => {
  // « Aujourd'hui » = lun. 9 nov. 2026 (jour des séances testées) : une séance ne se démarre que le jour J.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("cocher crédite les kcal et démarre la séance ; tout décocher la remet en prévue", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const s = db.tables.seances.find((x: any) => x.jour === "2026-11-09");
    const exos = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id);
    const r1 = await cocherExercice(db, USER, exos[0].id, true);
    expect(r1.kcal).toBe(exos[0].kcal);
    expect(s.etat).toBe("en_cours");
    await cocherExercice(db, USER, exos[0].id, false);
    expect(s.etat).toBe("prevue");
    expect(s.debut_le).toBeNull();
  });

  it("terminer compte le reste comme fait et fige les kcal", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const s = db.tables.seances.find((x: any) => x.jour === "2026-11-09");
    const total = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).reduce((a: number, e: any) => a + e.kcal, 0);
    const r = await terminerSeance(db, USER, s.id, 4);
    expect(r.kcal).toBe(total);
    expect(s.etat).toBe("faite");
    expect(db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).every((e: any) => e.fait)).toBe(true);
  });

  it("une séance de boxe terminée vaut MET 7,8 × poids × durée prévue", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const boxe = db.tables.seances.find((x: any) => x.type === "boxe");
    vi.setSystemTime(new Date(boxe.jour + "T10:00:00Z"));
    const r = await terminerSeance(db, USER, boxe.id);
    expect(r.kcal).toBe(kcalPour(7.8, 80, 60 * 60));
  });
});

describe("equivalents / remplacerExercice", () => {
  it("propose des exercices du même muscle cible, matériel disponible", async () => {
    const db = base();
    const eq = await equivalents(db, "0025", PARAMETRES_SPORT_DEFAUT.materiel, [], 5); // Barbell Bench Press
    expect(eq.length).toBe(5);
    expect(eq.every((e) => e.muscles.map((m) => m.toLowerCase()).includes("pectorals"))).toBe(true);
    expect(eq.find((e) => e.id === "0025")).toBeUndefined();
  });

  it("remplace dans toutes les séances à venir du programme, avec kcal recalculées et substitut_de renseigné", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const premiere = db.tables.exercices_seance.find((e: any) => e.exercice_id === "0025");
    const occurrences = db.tables.exercices_seance.filter((e: any) => e.exercice_id === "0025").length;
    const r = await remplacerExercice(db, USER, premiere.id, "0302", "programme");
    expect(r.remplaces).toBe(occurrences);
    expect(db.tables.exercices_seance.filter((e: any) => e.exercice_id === "0025")).toHaveLength(0);
    expect(premiere.exercice_id).toBe("0302");
    expect(premiere.substitut_de).toBe("0025");
    expect(premiere.kcal).toBe(kcalPour(4.5, 80, premiere.duree_s));
  });
});

describe("plusieurs séances le même jour", () => {
  const doubleLundi = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80, jours_boxe: [1] }; // lundi : salle + boxe

  it("planSemaine place salle et boxe le même jour, sans avertissement", () => {
    const plan = planSemaine(doubleLundi);
    expect(plan.jours[1].map((s) => s.genre)).toEqual(["salle", "boxe"]);
    expect(plan.doubles).toEqual([1]);
    expect(plan.nb_salle).toBe(4);
    expect(plan.nb_boxe).toBe(1);
    expect(plan.avertissements).toEqual([]);
  });

  it("planSemaine signale un rythme sans assez de jours cochés", () => {
    const plan = planSemaine({ ...PARAMETRES_SPORT_DEFAUT, jours_salle: [1, 3] });
    expect(plan.nb_salle).toBe(2);
    expect(plan.avertissements[0]).toMatch(/2 jour/);
  });

  it("le générateur crée deux séances ce jour-là (la boxe n'est plus ignorée)", async () => {
    const db = base();
    const r = await genererProgramme(db, USER, doubleLundi, "2026-11-09");
    expect(r.nb_seances).toBe(60);
    expect(r.avertissements).toEqual([]);
    const lundi = db.tables.seances.filter((s: any) => s.jour === "2026-11-09");
    expect(lundi.map((s: any) => s.type).sort()).toEqual(["boxe", "upper"]);
  });

  it("seancesDuJour rend les deux, salle d'abord ; seance_du_jour aussi, sans erreur", async () => {
    const db = base();
    await genererProgramme(db, USER, doubleLundi, "2026-11-09");
    const ss = await seancesDuJour(db, USER, "2026-11-09");
    expect(ss.map((s) => s.type)).toEqual(["upper", "boxe"]);
    const out = await executer("seance_du_jour", { jour: "2026-11-09" }, { db, userId: USER });
    expect(out.seances).toHaveLength(2);
    expect(out.seance?.type).toBe("upper");
  });

  it("trierSeancesDuJour met la boxe après la salle", () => {
    const t = trierSeancesDuJour([
      { type: "boxe", created_at: "2026-11-09T08:00:00Z" },
      { type: "lower", created_at: "2026-11-09T09:00:00Z" },
    ]);
    expect(t.map((s) => s.type)).toEqual(["lower", "boxe"]);
  });
});

describe("phasesProgramme", () => {
  it("hypertrophie : bloc 1 hypertrophie, bloc 2 force, bloc 3 mixte, décharge toutes les 4 semaines", () => {
    const ph = phasesProgramme({ objectif: "hypertrophie", semaines: 12 });
    expect(ph.map((p) => p.focus)).toEqual([
      "hypertrophie",
      "hypertrophie",
      "hypertrophie",
      "deload",
      "force",
      "force",
      "force",
      "deload",
      "mixte",
      "mixte",
      "mixte",
      "deload",
    ]);
  });
  it("concorde avec le focus des séances générées", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80, objectif: "force", semaines: 8 }, "2026-11-09");
    const ph = phasesProgramme({ objectif: "force", semaines: 8 });
    for (const s of db.tables.seances.filter((x: any) => x.type !== "boxe")) expect(s.focus).toBe(ph[s.semaine - 1].focus);
  });
});

describe("onboarding → paramètres", () => {
  it("traduit les réponses en paramètres du générateur (salle seule, sans boxe)", async () => {
    const { appliquerProfil } = await import("../src/sport");
    const p = appliquerProfil(PARAMETRES_SPORT_DEFAUT, {
      seances_semaine: 4,
      jours: [5, 1, 3, 6],
      duree_min: 75,
      objectifs: ["masse", "force"],
      niveau: "beginner",
      echeance_semaines: 30,
      lieu: "les_deux",
      salle: "basique",
      materiel_maison: ["kettlebell", "elastiques"],
      poids_kg: 78.5,
    });
    expect(p.rythme).toEqual({ salle: 4, boxe: 0 });
    expect(p.jours_salle).toEqual([1, 3, 5, 6]);
    expect(p.jours_boxe).toEqual([]);
    expect(p.duree_min).toBe(75);
    expect(p.objectif).toBe("force"); // ordre de l'écran : Force avant Prise de muscle
    expect(p.niveau).toBe("beginner");
    expect(p.semaines).toBe(24); // borné
    expect(p.materiel).toEqual(expect.arrayContaining(["dumbbell", "cable", "kettlebell", "band", "body weight"]));
    expect(p.materiel).not.toContain("barbell");
    expect(p.poids_kg).toBe(78.5);
  });

  it("calcule les cibles kcal et protéines (Mifflin-St Jeor, objectif de poids)", async () => {
    const { ciblesDepuisProfil, poidsCibleParDefaut } = await import("../src/sport");
    expect(ciblesDepuisProfil({ sexe: "homme", age: 31 })).toBeNull();
    const profil = { sexe: "homme", age: 31, taille_cm: 178, poids_kg: 78.5, activite: "actif", objectifs: ["force", "masse"], duree_min: 75 } as const;
    expect(poidsCibleParDefaut(profil)).toBe(81.5);
    const c = ciblesDepuisProfil({ ...profil, objectifs: [...profil.objectifs] });
    // BMR = 785 + 1112,5 − 155 + 5 = 1747,5 ; × 1,45 = 2533,9 ; × 1,08 (prise) = 2736,6
    expect(c).toEqual({ kcal_repos: 2740, kcal_seance: 3160, proteines_g: 163 });
  });

  it("regler_sport fusionne le profil, recalcule le programme et la nutrition si demandé", async () => {
    const db = base();
    await executer("regler_sport", { profil: { seances_semaine: 3, jours: [1, 3, 5] }, onboarding: { etape: 6 } }, { db, userId: USER });
    const r = await executer(
      "regler_sport",
      { profil: { sexe: "homme", age: 31, taille_cm: 178, poids_kg: 78.5, activite: "actif", objectifs: ["force"], nutrition: "ia" } },
      { db, userId: USER },
    );
    expect(r.profil?.jours).toEqual([1, 3, 5]); // conservé
    expect(r.rythme).toEqual({ salle: 3, boxe: 0 });
    expect(r.onboarding?.etape).toBe(6);
    const { parametresNutrition } = await import("../src/nutrition");
    const n = await parametresNutrition(db, USER);
    expect(n.cible_kcal).toBe(2530); // force seule : maintien
    expect(n.proteines_g).toBe(157);
  });
});

describe("séance en direct (workflow Home → séance)", () => {
  // « Aujourd'hui » = lun. 9 nov. 2026 (jour des séances testées) : une séance ne se démarre que le jour J.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-09T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const seanceDuLundi = async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const s = db.tables.seances.find((x: any) => x.jour === "2026-11-09" && x.type !== "boxe");
    const exos = db.tables.exercices_seance.filter((e: any) => e.seance_id === s.id).sort((a: any, b: any) => a.ordre - b.ordre);
    return { db, s, exos };
  };

  it("chronoSecondes déduit les pauses et se fige pendant une pause et à la fin", () => {
    const t0 = "2026-11-09T18:00:00Z";
    const maintenant = new Date("2026-11-09T18:40:00Z");
    expect(chronoSecondes({ debut_le: null }, maintenant)).toBe(0);
    expect(chronoSecondes({ debut_le: t0, pause_cumul_s: 300 }, maintenant)).toBe(35 * 60);
    expect(chronoSecondes({ debut_le: t0, pause_le: "2026-11-09T18:30:00Z", pause_cumul_s: 0 }, maintenant)).toBe(30 * 60);
    expect(chronoSecondes({ debut_le: t0, faite_le: "2026-11-09T19:02:00Z", pause_cumul_s: 120 }, maintenant)).toBe(60 * 60);
  });

  it("démarrer lance le chrono sans rien cocher ; pause puis reprise cumulent le temps de pause", async () => {
    vi.useFakeTimers();
    try {
      const { db, s, exos } = await seanceDuLundi();
      vi.setSystemTime(new Date("2026-11-09T18:00:00Z"));
      const r = await demarrerSeance(db, USER, s.id);
      expect(r.etat).toBe("en_cours");
      expect(s.debut_le).toBe("2026-11-09T18:00:00.000Z");
      expect(exos.every((e: any) => !e.fait)).toBe(true);
      expect(exerciceEnCours(exos, s.etat)?.id).toBe(exos[0].id);
      vi.setSystemTime(new Date("2026-11-09T18:10:00Z"));
      expect((await chronoSeance(db, USER, s.id, "pause")).en_pause).toBe(true);
      vi.setSystemTime(new Date("2026-11-09T18:15:00Z"));
      const rep = await chronoSeance(db, USER, s.id, "reprendre");
      expect(rep.en_pause).toBe(false);
      expect(s.pause_cumul_s).toBe(300);
      expect(rep.chrono_s).toBe(600);
      // redémarrer ne remet pas le chrono à zéro
      await demarrerSeance(db, USER, s.id);
      expect(s.debut_le).toBe("2026-11-09T18:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });

  it("valider_serie empile les séries ; la dernière coche l'exercice et crédite ses kcal", async () => {
    const { db, s, exos } = await seanceDuLundi();
    const e = exos[0];
    for (let i = 1; i < e.series; i++) {
      const r = await validerSerie(db, USER, e.id, { charge_kg: 80 });
      expect(r.series_faites).toBe(i);
      expect(r.exercice_fait).toBe(false);
    }
    expect(s.etat).toBe("en_cours");
    expect(seriesFaites(e)).toBe(e.series - 1);
    const fin = await validerSerie(db, USER, e.id);
    expect(fin.exercice_fait).toBe(true);
    expect(fin.kcal).toBe(e.kcal);
    expect(e.fait).toBe(true);
    expect(e.charge_kg).toBe(80);
    expect(e.realise.series.at(-1).charge_kg).toBe(80);
    expect(exerciceEnCours(exos, s.etat)?.id).toBe(exos[1].id);
  });

  it("terminer avec un exercice raté : non compté, reprogrammé en fin de la prochaine séance prévue", async () => {
    const { db, s, exos } = await seanceDuLundi();
    await demarrerSeance(db, USER, s.id);
    const rate = exos[exos.length - 1];
    const r = await terminerSeance(db, USER, s.id, 4, undefined, [rate.id]);
    expect(rate.fait).toBe(false);
    expect(rate.realise.rate).toBe(true);
    const total = exos.filter((e: any) => e.id !== rate.id).reduce((a: number, e: any) => a + e.kcal, 0);
    expect(r.kcal).toBe(total);
    expect(r.rates).toHaveLength(1);
    const cible = r.rates[0].reprogramme!;
    expect(cible.jour > s.jour).toBe(true);
    const ajoute = db.tables.exercices_seance.filter((e: any) => e.seance_id === cible.seance_id && e.exercice_id === rate.exercice_id);
    expect(ajoute).toHaveLength(1);
    expect(ajoute[0].series).toBe(rate.series);
    expect(rate.realise.reprogramme.seance_id).toBe(cible.seance_id);
  });

  it("volume, reps prescrites et défi de la semaine", () => {
    expect(repsPrescrites("8")).toBe(8);
    expect(repsPrescrites("8-10")).toBe(8);
    expect(repsPrescrites("30s")).toBe(0);
    expect(
      volumeSeance([
        { fait: true, series: 5, reps: "5", charge_kg: 80, realise: null },
        {
          fait: false,
          series: 3,
          reps: "8",
          charge_kg: 15,
          realise: {
            series: [
              { reps: 8, charge_kg: 15, le: "" },
              { reps: 6, charge_kg: null, le: "" },
            ],
          },
        },
        { fait: false, series: 3, reps: "12", charge_kg: 20, realise: null },
      ]),
    ).toBe(5 * 5 * 80 + 8 * 15 + 6 * 15);
    expect(
      defiSemaine([
        { type: "push", etat: "faite" },
        { type: "boxe", etat: "prevue" },
        { type: "pull", etat: "faite" },
      ]),
    ).toEqual({ total: 2, faites: 2, releve: true });
    expect(defiSemaine([])).toEqual({ total: 0, faites: 0, releve: false });
  });

  it("les outils passent par executer (agent et app : même règle)", async () => {
    const { db, s, exos } = await seanceDuLundi();
    const ctx = { db, userId: USER };
    await executer("demarrer_seance", { seance_id: s.id }, ctx);
    await executer("valider_serie", { exercice_seance_id: exos[0].id }, ctx);
    expect(seriesFaites(exos[0])).toBe(1);
    const r = await executer("terminer_seance", { seance_id: s.id, rates: [] }, ctx);
    expect(r.rates).toEqual([]);
    expect(s.etat).toBe("faite");
  });
});

describe("jour J : une séance ne se démarre que le jour prévu", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z")); // mer. 11 nov.
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("peutDemarrer : jour J, ou déjà en cours / faite", () => {
    expect(peutDemarrer({ jour: "2026-11-11", etat: "prevue" }, "2026-11-11")).toBe(true);
    expect(peutDemarrer({ jour: "2026-11-12", etat: "prevue" }, "2026-11-11")).toBe(false);
    expect(peutDemarrer({ jour: "2026-11-09", etat: "prevue" }, "2026-11-11")).toBe(false);
    expect(peutDemarrer({ jour: "2026-11-10", etat: "en_cours" }, "2026-11-11")).toBe(true);
  });

  it("démarrer, cocher, valider une série ou terminer une séance d'un autre jour est refusé (rien n'est écrit)", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    for (const jour of ["2026-11-09", "2026-11-13"]) {
      const s = db.tables.seances.find((x: any) => x.jour === jour && x.type !== "boxe");
      const e = db.tables.exercices_seance.find((x: any) => x.seance_id === s.id);
      await expect(demarrerSeance(db, USER, s.id)).rejects.toThrow(/ne peut être démarrée que ce jour-là/);
      await expect(cocherExercice(db, USER, e.id, true)).rejects.toThrow(/jour-là/);
      await expect(validerSerie(db, USER, e.id)).rejects.toThrow(/jour-là/);
      await expect(terminerSeance(db, USER, s.id)).rejects.toThrow(/jour-là/);
      expect(s.etat).toBe("prevue");
      expect(e.fait).toBe(false);
      expect(e.realise).toBeNull();
    }
    // Le jour J, ça passe.
    const auj = db.tables.seances.find((x: any) => x.jour === "2026-11-11" && x.type !== "boxe");
    if (auj) expect((await demarrerSeance(db, USER, auj.id)).etat).toBe("en_cours");
  });
});

describe("parcours « Nouveau programme » (onglet Programme)", () => {
  it("traduit les réponses en paramètres sans toucher au profil (niveau, matériel)", () => {
    const base = ParametresSport.parse({ niveau: "advanced", materiel: ["dumbbell", "body weight"], rythme: { salle: 4, boxe: 1 } });
    const p = parametresDepuisReponses(base, { objectif: "force", semaines: 12, jours: [4, 1, 0, 2, 1], duree_min: 75 });
    expect(p.objectif).toBe("force");
    expect(p.semaines).toBe(12);
    expect(p.jours_salle).toEqual([0, 1, 2, 4]);
    expect(p.rythme).toEqual({ salle: 4, boxe: 0 });
    expect(p.duree_min).toBe(75);
    expect(p.niveau).toBe("advanced");
    expect(p.materiel).toEqual(["dumbbell", "body weight"]);
  });

  it("pré-remplit « Modifier » depuis les paramètres, aller-retour stable", () => {
    const base = ParametresSport.parse({ objectif: "hypertrophie", semaines: 8, jours_salle: [1, 2, 4, 5], rythme: { salle: 3, boxe: 0 }, duree_min: 60 });
    const r = reponsesDepuisParametres(base);
    expect(r).toEqual({ preference_materiel: "mix", objectif: "masse", semaines: 8, jours: [1, 2, 4], duree_min: 60, perso: [] });
    const p = parametresDepuisReponses(base, r);
    expect(reponsesDepuisParametres(p)).toEqual(r);
  });

  it("regroupe les semaines par phase en plages", () => {
    const phases = phasesProgramme({ objectif: "hypertrophie", semaines: 12 });
    const g = plagesPhases(phases);
    expect(g.map((x) => x.focus)).toEqual(["hypertrophie", "deload", "force", "mixte"]);
    expect(g.find((x) => x.focus === "deload")!.plages).toBe("S4 · S8 · S12");
    expect(g[0].plages).toBe("S1–3");
  });
});

describe("Mes séances (modèles) et modifier le programme", () => {
  // « Aujourd'hui » = mer. 11 nov. 2026, programme démarré le lun. 9 nov.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  const avecProgramme = async () => {
    const db = fausseDb({
      exercices_ref: refs,
      programmes: [],
      seances: [],
      exercices_seance: [],
      pesees: [],
      profils: [{ id: USER, reglages: {} }],
      modeles_seance: [],
      modeles_seance_exercices: [],
    });
    const params = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80, rythme: { salle: 3, boxe: 0 }, jours_salle: [1, 3, 5], jours_boxe: [] };
    await executer("regler_sport", params, { db, userId: USER });
    await genererProgramme(db, USER, params, "2026-11-09");
    return db;
  };
  const exosRef = () => refs.filter((r) => r.equipement === "dumbbell").slice(0, 3);

  it("crée une séance perso (exercices dans l'ordre, durée estimée) et la relit", async () => {
    const db = await avecProgramme();
    const [a, b] = exosRef();
    const r = await creerModeleSeance(db, USER, {
      nom: "Bras du jeudi",
      type: "upper",
      exercices: [
        { exercice_id: a.id, series: 4, reps: "10", repos_s: 60 },
        { exercice_id: b.id, series: 3, reps: "12", repos_s: 60, charge_kg: 12 },
      ],
    });
    expect(r.duree_min).toBeGreaterThan(10);
    const m = (await chargerModeles(db, USER))[r.id];
    expect(m.nom).toBe("Bras du jeudi");
    expect(m.exercices.map((x) => x.exercice_id)).toEqual([a.id, b.id]);
    expect(m.exercices[1].charge_kg).toBe(12);
  });

  it("chaque jeudi à partir d'aujourd'hui : remplace les séances à venir ce jour-là, garde le passé, allège en décharge", async () => {
    const db = await avecProgramme();
    const [a, b] = exosRef();
    const { id } = await creerModeleSeance(db, USER, {
      nom: "Bras",
      type: "upper",
      exercices: [
        { exercice_id: a.id, series: 4, reps: "10", repos_s: 60 },
        { exercice_id: b.id, series: 3, reps: "12", repos_s: 60 },
      ],
    });
    const lundi = db.tables.seances.find((s: any) => s.jour === "2026-11-09");
    await planifierModeleSeance(db, USER, { modele_id: id, jour_semaine: 4 });
    const jeudis = db.tables.seances.filter((s: any) => new Date(s.jour + "T12:00:00Z").getUTCDay() === 4);
    expect(jeudis.length).toBe(12);
    expect(jeudis.every((s: any) => s.modele_id === id && s.titre === "Bras")).toBe(true);
    const s4 = jeudis.find((s: any) => s.semaine === 4);
    const exos4 = db.tables.exercices_seance.filter((e: any) => e.seance_id === s4.id);
    expect(exos4.map((e: any) => e.series)).toEqual([3, 2]);
    expect(db.tables.seances.find((s: any) => s.id === lundi.id)).toBeDefined();
    // Les lundis / mercredis / vendredis générés restent.
    expect(
      db.tables.seances.filter((s: any) => s.jour >= "2026-11-11" && [1, 3, 5].includes(new Date(s.jour + "T12:00:00Z").getUTCDay())).length,
    ).toBeGreaterThan(30);
  });

  it("une seule fois à une date : remplace la séance de salle prévue ce jour-là", async () => {
    const db = await avecProgramme();
    const [a] = exosRef();
    const { id } = await creerModeleSeance(db, USER, { nom: "Express", exercices: [{ exercice_id: a.id, series: 3, reps: "15", repos_s: 45 }] });
    const r = await planifierModeleSeance(db, USER, { modele_id: id, date: "2026-11-13" });
    expect(r.mode).toBe("une_fois");
    const ceJour = db.tables.seances.filter((s: any) => s.jour === "2026-11-13");
    expect(ceJour).toHaveLength(1);
    expect(ceJour[0].modele_id).toBe(id);
    await expect(planifierModeleSeance(db, USER, { modele_id: id, date: "2026-11-10" })).rejects.toThrow(/passé/);
  });

  it("modifier le programme : nouveaux jours et durée à partir d'une date, même programme, faites intactes, fin recalculée", async () => {
    const db = await avecProgramme();
    const prog = db.tables.programmes.find((p: any) => p.actif);
    const lundi = db.tables.seances.find((s: any) => s.jour === "2026-11-09");
    lundi.etat = "faite";
    const r = await modifierProgramme(db, USER, { jours_salle: [2, 4], duree_min: 45, semaines: 8, a_partir_de: "2026-11-16" });
    expect(r.programme_id).toBe(prog.id);
    expect(r.depuis).toBe("2026-11-16");
    expect(prog.fin).toBe("2027-01-03");
    const apres = db.tables.seances.filter((s: any) => s.jour >= "2026-11-16");
    expect(new Set(apres.map((s: any) => new Date(s.jour + "T12:00:00Z").getUTCDay()))).toEqual(new Set([2, 4]));
    expect(apres.every((s: any) => s.programme_id === prog.id && s.jour <= "2027-01-03")).toBe(true);
    // Avant le 16 : inchangé (dont la séance faite) ; la semaine 2 garde son numéro.
    expect(db.tables.seances.find((s: any) => s.id === lundi.id).etat).toBe("faite");
    expect(apres.find((s: any) => s.jour === "2026-11-17").semaine).toBe(2);
    // Une date passée est ramenée à aujourd'hui.
    expect((await modifierProgramme(db, USER, { a_partir_de: "2026-11-01" })).depuis).toBe("2026-11-11");
  });

  it("modifier une séance perso met à jour ses séances à venir ; la supprimer rend ses jours au générateur", async () => {
    const db = await avecProgramme();
    const [a, b, c] = exosRef();
    const { id } = await creerModeleSeance(db, USER, { nom: "Bras", exercices: [{ exercice_id: a.id, series: 3, reps: "10", repos_s: 60 }] });
    await planifierModeleSeance(db, USER, { modele_id: id, jour_semaine: 4 });
    await modifierModeleSeance(db, USER, id, {
      nom: "Bras v2",
      type: "upper",
      exercices: [
        { exercice_id: b.id, series: 4, reps: "8", repos_s: 90 },
        { exercice_id: c.id, series: 3, reps: "12", repos_s: 60 },
      ],
    });
    const jeudi = db.tables.seances.find((s: any) => s.jour === "2026-11-12");
    expect(jeudi.titre).toBe("Bras v2");
    expect(db.tables.exercices_seance.filter((e: any) => e.seance_id === jeudi.id).map((e: any) => e.exercice_id)).toEqual([b.id, c.id]);
    await supprimerModeleSeance(db, USER, id);
    const jeudis = db.tables.seances.filter((s: any) => s.jour >= "2026-11-12" && new Date(s.jour + "T12:00:00Z").getUTCDay() === 4);
    expect(jeudis.length).toBeGreaterThan(0);
    expect(jeudis.every((s: any) => s.modele_id === null)).toBe(true);
  });
});

describe("remise à zéro Sport (temporaire)", () => {
  it("supprime programmes, séances, séances perso et réglages Sport ; garde les pesées et la nutrition", async () => {
    const db = fausseDb({
      exercices_ref: refs,
      programmes: [],
      seances: [],
      exercices_seance: [],
      pesees: [{ id: "p1", user_id: USER, jour: "2026-11-01", poids_kg: 80 }],
      profils: [{ id: USER, reglages: { nutrition: { cible_kcal: 2500 } } }],
      modeles_seance: [],
      modeles_seance_exercices: [],
    });
    await executer("regler_sport", { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, { db, userId: USER });
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    await creerModeleSeance(db, USER, { nom: "Test", exercices: [{ exercice_id: refs[0].id, series: 3, reps: "10", repos_s: 60 }] });
    const r = await reinitialiserSport(db, USER);
    expect(r.supprime.programmes).toBe(1);
    expect(r.supprime.seances).toBeGreaterThan(0);
    expect(r.supprime.seances_perso).toBe(1);
    for (const t of ["programmes", "seances", "exercices_seance", "modeles_seance", "modeles_seance_exercices"]) expect(db.tables[t]).toHaveLength(0);
    expect(db.tables.profils[0].reglages).toEqual({ nutrition: { cible_kcal: 2500 } });
    expect(db.tables.pesees).toHaveLength(1);
  });
});

describe("un programme commence un jour de séance", () => {
  afterEach(() => {
    vi.useRealTimers();
  });
  const params = { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80, rythme: { salle: 2, boxe: 0 }, jours_salle: [1, 4], jours_boxe: [] };

  it("premierJourSeance / joursDeSeance", () => {
    const p = ParametresSport.parse(params);
    expect(joursDeSeance(p)).toEqual([1, 4]);
    expect(premierJourSeance(p, "2026-11-14")).toBe("2026-11-16"); // samedi → lundi
    expect(premierJourSeance(p, "2026-11-12")).toBe("2026-11-12"); // jeudi = jour de séance
    expect(
      joursDeSeance(
        ParametresSport.parse({ ...params, rythme: { salle: 3, boxe: 0 }, seances_perso: [{ jour: 6, modele_id: "11111111-1111-4111-8111-111111111111" }] }),
      ),
    ).toEqual([1, 4, 6]);
  });

  it("samedi « aujourd'hui » sans séance le samedi : le programme démarre lundi, rien n'est posé samedi", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-14T10:00:00Z")); // samedi
    const db = base();
    const r = await genererProgramme(db, USER, params, "2026-11-14");
    expect(r.debut).toBe("2026-11-16");
    expect(db.tables.programmes[0].debut).toBe("2026-11-16");
    expect(db.tables.seances.find((s: any) => s.jour < "2026-11-16")).toBeUndefined();
    expect(db.tables.seances.find((s: any) => s.jour === "2026-11-16")).toBeDefined();
  });

  it("aujourd'hui est un jour de séance : elle est là et se démarre", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-12T10:00:00Z")); // jeudi
    const db = base();
    await genererProgramme(db, USER, params, "2026-11-12");
    const duJour = db.tables.seances.find((s: any) => s.jour === "2026-11-12");
    expect((await demarrerSeance(db, USER, duJour.id)).etat).toBe("en_cours");
  });
});

describe("matériel préféré, morphologie, douleurs", () => {
  const generer = async (profil: NonNullable<ParametresSport["profil"]>, objectif: ParametresSport["objectif"] = "hypertrophie") => {
    const db = base();
    await genererProgramme(
      db,
      USER,
      { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 4, boxe: 0 }, jours_boxe: [], objectif, poids_kg: 90, profil },
      "2026-11-09",
    );
    const parId = new Map(exercicesRef().map((e) => [e.id, e]));
    return db.tables.exercices_seance.map((e: any) => parId.get(e.exercice_id)!);
  };
  const part = (exos: any[], materiel: string[]) => exos.filter((e) => materiel.includes(e.equipement)).length / exos.length;

  it("la préférence oriente le choix : plus de machines, de poulies ou de poids libres que le mix", async () => {
    const mix = await generer({ preference_materiel: "mix" });
    const machines = await generer({ preference_materiel: "machines" });
    const poulies = await generer({ preference_materiel: "poulies" });
    const libres = await generer({ preference_materiel: "poids_libres" });
    const M = ["leverage machine", "smith machine", "sled machine"];
    const L = ["barbell", "dumbbell", "ez barbell", "kettlebell", "weighted"];
    expect(part(machines, M)).toBeGreaterThan(0.7);
    expect(part(machines, M)).toBeGreaterThan(part(mix, M) + 0.3);
    expect(part(poulies, ["cable"])).toBeGreaterThan(part(mix, ["cable"]) + 0.15);
    expect(part(libres, L)).toBeGreaterThanOrEqual(part(mix, L));
    // Une préférence n'impose jamais un exercice hors sujet : les jambes gardent un vrai composé (squat, presse, fente).
    expect(poulies.some((e) => /squat|leg press|lunge/i.test(e.nom))).toBe(true);
  });

  it("profil rond : ni tractions, ni dips, ni sauts, ni course — tirage à la poulie et cardio sans impact", async () => {
    const exos = await generer({ morpho: "rond" }, "perte_de_gras");
    expect(exos.filter((e) => /pull-?up|chin-?up|dip|burpee|jump|running/i.test(e.nom) && e.equipement !== "leverage machine")).toEqual([]);
    expect(exos.some((e) => /running/i.test(e.nom))).toBe(false);
    expect(exos.some((e) => /pulldown/i.test(e.nom))).toBe(true);
    expect(exos.some((e) => /bike|elliptical|walk/i.test(e.nom))).toBe(true);
  });

  it("douleurs : les mouvements à risque pour la zone sont écartés", async () => {
    const genou = await generer({ douleurs: ["genou"] });
    expect(genou.filter((e) => /lunge|jump|sissy|pistol|step-?up/i.test(e.nom))).toEqual([]);
    const dos = await generer({ douleurs: ["dos"] });
    expect(dos.filter((e) => /good morning|bent.?over|deadlift/i.test(e.nom))).toEqual([]);
    expect(deconseille({ nom: "Barbell Bench Press", equipement: "barbell", partie_corps: "chest" }, { douleurs: ["genou"], morpho: "rond" })).toBe(false);
  });

  it("à poids égal, costaud et rond n'ont pas les mêmes cibles (masse maigre)", () => {
    const commun = { sexe: "homme" as const, age: 30, taille_cm: 180, poids_kg: 95, activite: "actif" as const, objectifs: ["sante" as const] };
    const costaud = ciblesDepuisProfil({ ...commun, morpho: "costaud" })!;
    const rond = ciblesDepuisProfil({ ...commun, morpho: "rond" })!;
    const sans = ciblesDepuisProfil(commun)!;
    expect(masseMaigre({ ...commun, morpho: "costaud" })).toBe(76);
    expect(masseMaigre({ ...commun, morpho: "rond" })).toBe(66.5);
    expect(costaud.kcal_repos).toBeGreaterThan(rond.kcal_repos + 100);
    expect(costaud.proteines_g).toBe(182);
    expect(rond.proteines_g).toBe(160);
    expect(sans.proteines_g).toBe(190);
  });

  it("le parcours « Nouveau programme » range matériel préféré et morphologie dans le profil", () => {
    const depart = ParametresSport.parse({ profil: { niveau: "advanced", douleurs: ["epaule"] } });
    const p = parametresDepuisReponses(depart, {
      objectif: "masse",
      semaines: 12,
      jours: [1, 3, 5],
      duree_min: 60,
      perso: [],
      preference_materiel: "poulies",
      morpho: "costaud",
    });
    expect(p.profil).toMatchObject({ niveau: "advanced", douleurs: ["epaule"], preference_materiel: "poulies", morpho: "costaud" });
    expect(reponsesDepuisParametres(p)).toMatchObject({ preference_materiel: "poulies", morpho: "costaud" });
  });
});

describe("le découpage s'adapte au nombre de séances", () => {
  const types = (n: number, jours: number[]) => {
    const plan = planSemaine({ ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: n, boxe: 0 }, jours_salle: jours, jours_boxe: [] });
    return { titres: plan.jours.flat().map((x) => x.titre), plan };
  };

  it("2 jours : deux séances corps entier complémentaires, pas un haut / bas", () => {
    const { titres, plan } = types(2, [1, 4]);
    expect(titres).toEqual(["Corps entier A", "Corps entier B"]);
    expect(plan.explication).toMatch(/2 fois par semaine/);
  });

  it("3 jours : corps entier A / B / A ; 4 jours : haut / bas deux fois", () => {
    expect(types(3, [1, 3, 5]).titres).toEqual(["Corps entier A", "Corps entier B", "Corps entier A"]);
    expect(types(4, [1, 2, 4, 5]).titres).toEqual(["Haut du corps A", "Bas du corps A", "Haut du corps B", "Bas du corps B"]);
  });

  it("à 2 jours, pectoraux, dos et jambes sont travaillés dans les deux séances", async () => {
    const db = base();
    await genererProgramme(
      db,
      USER,
      { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 2, boxe: 0 }, jours_salle: [1, 4], jours_boxe: [], duree_min: 75, poids_kg: 80 },
      "2026-11-09",
    );
    const parId = new Map(exercicesRef().map((e) => [e.id, e]));
    const s1 = db.tables.seances.filter((s: any) => s.semaine === 1);
    expect(s1).toHaveLength(2);
    for (const se of s1) {
      const parties = db.tables.exercices_seance.filter((e: any) => e.seance_id === se.id).map((e: any) => parId.get(e.exercice_id)!.partie_corps);
      expect(parties).toEqual(expect.arrayContaining(["chest", "back", "upper legs"]));
    }
  });
});

describe("méthodes de référence", () => {
  it("la méthode suit l'objectif et le niveau ; on peut en imposer une", () => {
    expect(choisirMethode({ objectif: "force", niveau: "beginner" }).id).toBe("progression_lineaire");
    expect(choisirMethode({ objectif: "force", niveau: "advanced" }).id).toBe("cinq_trois_un");
    expect(choisirMethode({ objectif: "hypertrophie", niveau: "intermediate" }).id).toBe("double_progression");
    expect(choisirMethode({ objectif: "perte_de_gras", niveau: "beginner" }).id).toBe("seche");
    expect(choisirMethode({ objectif: "endurance", niveau: "beginner" }).id).toBe("endurance_musculaire");
    expect(choisirMethode({ objectif: "hypertrophie", niveau: "beginner", methode: "cinq_trois_un" }).id).toBe("cinq_trois_un");
    for (const m of Object.values(METHODES)) expect(m.sources.length, m.id).toBeGreaterThan(0);
  });

  const premiers = async (params: Partial<ParametresSport>) => {
    const db = base();
    const r = await genererProgramme(
      db,
      USER,
      { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 4, boxe: 0 }, jours_boxe: [], poids_kg: 80, ...params },
      "2026-11-09",
    );
    const seance = (semaine: number) => db.tables.seances.filter((s: any) => s.semaine === semaine)[0];
    const exos = (semaine: number) =>
      db.tables.exercices_seance.filter((e: any) => e.seance_id === seance(semaine).id).sort((a: any, b: any) => a.ordre - b.ordre);
    return { r, db, seance, exos };
  };

  it("5/3/1 : le mouvement principal suit la vague 5 → 3 → 5-3-1, puis décharge ; la consigne est dans la séance", async () => {
    const { r, db, seance, exos } = await premiers({ objectif: "force", niveau: "intermediate" });
    expect(r.methode).toBe("5/3/1");
    expect(db.tables.programmes[0].rythme.methode).toBe("cinq_trois_un");
    expect(exos(1)[0]).toMatchObject({ series: 3, reps: "5" });
    expect(exos(2)[0]).toMatchObject({ series: 3, reps: "3" });
    expect(exos(3)[0]).toMatchObject({ series: 3, reps: "5-3-1" });
    expect(exos(4)[0]).toMatchObject({ series: 2 });
    expect(exos(1)[1].reps).toBe("8-10");
    expect(seance(2).notes).toMatch(/70, 80 puis 90 %/);
    expect(seance(4).notes).toBeNull();
  });

  it("progression linéaire (force, débutant) : 3×5 sur les composés, toutes les semaines hors décharge", async () => {
    const { r, exos } = await premiers({ objectif: "force", niveau: "beginner" });
    expect(r.methode).toBe("Progression linéaire");
    for (const s of [1, 2, 3]) expect(exos(s)[0]).toMatchObject({ series: 3, reps: "5" });
  });

  it("lister_methodes rend les méthodes, leurs sources et la recommandée pour le profil", async () => {
    const db = base();
    const r = await executer("lister_methodes", {}, { db, userId: USER });
    expect(r.recommandee).toBe("double_progression");
    expect(r.methodes.map((m) => m.id)).toContain("cinq_trois_un");
    expect(r.methodes.every((m) => m.sources.every((x) => x.url.startsWith("https://")))).toBe(true);
  });
});

describe("simple et efficace : des classiques, pas de farfelus", () => {
  const noms = async (params: Partial<ParametresSport>) => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 82, ...params }, "2026-11-09");
    const parId = new Map(exercicesRef().map((e) => [e.id, e]));
    return db.tables.exercices_seance.map((e: any) => parId.get(e.exercice_id)!.nom as string);
  };

  it("tous les classiques existent dans le référentiel, et aucun n'est classé farfelu", () => {
    const connus = new Set(exercicesRef().map((e) => e.nom));
    expect(
      Object.values(CLASSIQUES)
        .flat()
        .filter((n) => !connus.has(n)),
    ).toEqual([]);
    expect(simplicite("Barbell Bench Press")).toBe("classique");
    expect(simplicite("Dumbbell Fly On Exercise Ball")).toBe("farfelu");
    expect(simplicite("Barbell Prone Incline Curl")).toBe("farfelu");
    expect(simplicite("Lever Kneeling Leg Curl")).toBe("farfelu");
  });

  it("en salle (4 ou 5 séances) : uniquement des classiques, développé couché et tirage en tête de séance", async () => {
    for (const salle of [4, 5]) {
      const tous = await noms({ rythme: { salle, boxe: 0 }, jours_salle: [1, 2, 3, 4, 5].slice(0, salle), jours_boxe: [] });
      expect([...new Set(tous.filter((n) => simplicite(n) !== "classique"))]).toEqual([]);
      expect(tous).toContain("Barbell Bench Press");
    }
  });

  it("à la maison avec peu de matériel : jamais de farfelu", async () => {
    const tous = await noms({ rythme: { salle: 3, boxe: 0 }, jours_boxe: [], materiel: ["dumbbell", "body weight", "band"] });
    expect(tous.filter((n) => simplicite(n) === "farfelu")).toEqual([]);
  });

  it("un même créneau garde le même exercice toutes les semaines d'un bloc (on progresse dessus)", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 82 }, "2026-11-09");
    const exos = (semaine: number) =>
      db.tables.seances
        .filter((x: any) => x.semaine === semaine && x.titre === "Haut du corps A")
        .flatMap((x: any) => db.tables.exercices_seance.filter((e: any) => e.seance_id === x.id).map((e: any) => e.exercice_id))
        .sort();
    // Le nombre d'exercices peut varier avec le volume de la semaine ; ceux qui restent sont les mêmes.
    const memes = (a: string[], b: string[]) => (a.length <= b.length ? a.every((x) => b.includes(x)) : b.every((x) => a.includes(x)));
    expect(memes(exos(1), exos(2))).toBe(true);
    expect(memes(exos(2), exos(3))).toBe(true);
  });

  it("équivalents : les classiques d'abord, les farfelus relégués", async () => {
    const curl = exercicesRef().find((e) => e.nom === "Barbell Prone Incline Curl")!;
    const eq = await equivalents(base(), curl.id, PARAMETRES_SPORT_DEFAUT.materiel);
    expect(simplicite(eq[0].nom)).toBe("classique");
    expect(eq.slice(0, 3).filter((e) => simplicite(e.nom) === "farfelu")).toEqual([]);
  });
});
