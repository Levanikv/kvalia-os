import { describe, expect, it } from "vitest";
import { executer } from "../src/actions";
import { lundiDe, niveauPour, prochainPalier, repsNombre, seuilNiveau, tableauSport, tonnageExercice } from "../src/tableau";
import { USER, fausseDb } from "./fausse-db";

describe("progression", () => {
  it("niveaux à seuils croissants, nom et XP restante", () => {
    expect([1, 2, 3, 6, 7].map(seuilNiveau)).toEqual([0, 250, 750, 3750, 5250]);
    expect(niveauPour(0)).toMatchObject({ niveau: 1, nom: "Recrue", xp_restant: 250 });
    expect(niveauPour(4990)).toMatchObject({ niveau: 6, nom: "Machine", xp_restant: 260, prochain: 7 });
    expect(niveauPour(99999).nom).toBe("Légende");
  });
  it("volume : reps, tonnage, paliers", () => {
    expect(repsNombre("8-10")).toBe(8);
    expect(repsNombre("max")).toBe(0);
    expect(tonnageExercice({ charge_kg: 80, series: 5, reps: "5", realise: null })).toBe(2000);
    expect(tonnageExercice({ charge_kg: 80, series: 3, reps: "10", realise: { reps_faites: 8 } })).toBe(1920);
    expect(tonnageExercice({ charge_kg: null, series: 3, reps: "10", realise: null })).toBe(0);
    expect(prochainPalier(62.4)).toBe(100);
    expect(lundiDe("2026-11-08")).toBe("2026-11-02");
  });
});

describe("tableauSport", () => {
  const P = "00000000-0000-4000-8000-0000000000aa";
  const seance = (id: string, jour: string, etat: string, type = "push") => ({
    id,
    user_id: USER,
    programme_id: P,
    jour,
    type,
    etat,
    created_at: `${jour}T08:00:00Z`,
  });
  const exo = (seance_id: string, charge: number, exercice_id = "dc") => ({
    id: `${seance_id}-${exercice_id}`,
    user_id: USER,
    seance_id,
    exercice_id,
    charge_kg: charge,
    series: 5,
    reps: "5",
    realise: null,
    fait: true,
  });
  const db = () =>
    fausseDb({
      programmes: [{ id: P, user_id: USER, nom: "Force", debut: "2026-10-19", actif: true }],
      seances: [
        // semaine du 26/10 : complète
        seance("a1", "2026-10-27", "faite"),
        seance("a2", "2026-10-29", "faite"),
        // semaine du 02/11 : complète
        seance("b1", "2026-11-03", "faite"),
        seance("b2", "2026-11-05", "faite"),
        // semaine du 09/11 : 1 faite sur 3 (+ un repos qui ne compte pas)
        seance("c1", "2026-11-10", "faite"),
        seance("c2", "2026-11-12", "prevue"),
        seance("c3", "2026-11-14", "prevue"),
        seance("r", "2026-11-11", "prevue", "repos"),
      ],
      exercices_seance: [exo("a1", 75), exo("b1", 80), exo("c1", 85), exo("a2", 110, "sq"), exo("b2", 120, "sq")],
      exercices_ref: [
        { id: "dc", nom: "barbell bench press", nom_fr: "Développé couché" },
        { id: "sq", nom: "barbell squat", nom_fr: null },
      ],
      pesees: [
        { id: "p1", user_id: USER, jour: "2026-11-01", poids_kg: 79 },
        { id: "p2", user_id: USER, jour: "2026-11-10", poids_kg: 78.4 },
      ],
      profils: [{ id: USER, reglages: {} }],
    });

  it("objectif de la semaine, série, rang, XP", async () => {
    const t = await tableauSport(db(), USER, "2026-11-12");
    expect(t.semaine).toMatchObject({ debut: "2026-11-09", fin: "2026-11-15", prevues: 3, faites: 1, restantes: 2, xp_a_gagner: 200 });
    expect(t.serie_semaines).toBe(2);
    expect(t.rang).toEqual({ seance_id: "c2", rang: 6, total: 7 });
    expect(t.progression).toMatchObject({ xp: 500, niveau: 2, nom: "Régulier" });
  });

  it("records du programme, volume, poids, coach", async () => {
    const t = await tableauSport(db(), USER, "2026-11-12");
    expect(t.records[0]).toMatchObject({ exercice_id: "dc", nom_fr: "Développé couché", charge_kg: 85, progression_kg: 10, semaines: 3, serie: [75, 80, 85] });
    expect(t.records[1]).toMatchObject({ exercice_id: "sq", charge_kg: 120, progression_kg: 10 });
    expect(t.semaine.tonnage_kg).toBe(85 * 25);
    expect(t.semaine.tonnage_precedente_kg).toBe(80 * 25 + 120 * 25);
    expect(t.poids).toEqual({ actuel: 78.4, serie: [79, 78.4] });
    // 12/11 = semaine 4 du programme (début 19/10) → décharge
    expect(t.coach.message).toMatch(/décharge/);
    expect(t.coach.detail).toBe("Coach · prochain badge à 25 t soulevées");
  });

  it("fin de bloc : le coach cite la charge du record principal", async () => {
    const t = await tableauSport(db(), USER, "2026-11-05", { semaineProgramme: 3 });
    expect(t.coach.message).toBe("Dernière semaine du bloc. Tiens 85 kg au Développé couché sur toutes les séries.");
  });

  it("outil MCP tableau_sport", async () => {
    const t = await executer("tableau_sport", { jour: "2026-11-12" }, { db: db(), userId: USER });
    expect(t.serie_semaines).toBe(2);
  });
});
