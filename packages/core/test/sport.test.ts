import { describe, expect, it } from "vitest";
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

  it("remplace le programme actif et supprime ses séances futures non faites", async () => {
    const db = base();
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, poids_kg: 80 }, "2026-11-09");
    const premier = db.tables.programmes[0].id;
    await genererProgramme(db, USER, { ...PARAMETRES_SPORT_DEFAUT, rythme: { salle: 3, boxe: 0 }, jours_salle: [1, 3, 5], poids_kg: 80 }, "2027-03-01");
    expect(db.tables.programmes.find((p: any) => p.id === premier).actif).toBe(false);
    expect(db.tables.seances.filter((s: any) => s.programme_id === premier)).toHaveLength(0);
    expect(db.tables.programmes.filter((p: any) => p.actif)).toHaveLength(1);
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
