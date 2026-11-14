import { describe, expect, it, vi } from "vitest";
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
  chronoSecondes,
  chronoSeance,
  defiSemaine,
  demarrerSeance,
  exerciceEnCours,
  repsPrescrites,
  seriesFaites,
  validerSerie,
  volumeSeance,
} from "../src/sport";
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

  it("remplace le programme actif, supprime ses séances futures non faites et garde les passées", async () => {
    // Horloge figée : « aujourd'hui » = mer. 11 nov. 2026, quelle que soit la date réelle du test.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-11T12:00:00Z"));
    try {
      const db = base();
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
      const premier = db.tables.programmes[0].id;
      const passees = db.tables.seances.filter((s: any) => s.programme_id === premier && s.jour < "2026-11-11").map((s: any) => s.id);
      expect(passees.length).toBeGreaterThan(0);
      await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 3, boxe: 0 }, jours_salle: [1, 3, 5], poids_kg: 80 }, "2027-03-01");
      expect(db.tables.programmes.find((p: any) => p.id === premier).actif).toBe(false);
      // Les séances passées restent dans l'historique ; toutes celles d'aujourd'hui et après sont supprimées.
      const restantes = db.tables.seances.filter((s: any) => s.programme_id === premier).map((s: any) => s.id);
      expect(restantes.sort()).toEqual([...passees].sort());
      expect(db.tables.programmes.filter((p: any) => p.actif)).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("suivi d'une séance", () => {
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
