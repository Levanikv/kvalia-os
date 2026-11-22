import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { creerDefi, defiValable, libelleJours, listerDefis, modifierDefi, noterDefi, serieDefi, supprimerDefi } from "../src/defis";
import { executer } from "../src/actions";
import { reinitialiserSport } from "../src/sport";
import { USER, fausseDb } from "./fausse-db";

// « Aujourd'hui » = mercredi 18 nov. 2026 (Paris), quelle que soit la date réelle du test.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T10:00:00Z"));
});
afterEach(() => vi.useRealTimers());

const base = () => fausseDb({ programmes: [{ id: "p1", user_id: USER, actif: true, debut: "2026-11-02", fin: "2026-12-27" }], defis: [], defis_suivi: [] });

describe("creerDefi", () => {
  it("part d'aujourd'hui, vaut tous les jours, s'arrête à la fin du programme, cible par défaut selon la mesure", async () => {
    const db = base();
    const d = await creerDefi(db, USER, { nom: "Marcher", mesure: "pas" });
    expect(d).toMatchObject({ debut: "2026-11-18", fin: "2026-12-27", cible: 10000, jours_semaine: [0, 1, 2, 3, 4, 5, 6], libelle_jours: "Tous les jours" });
    expect(db.tables.defis[0].programme_id).toBe("p1");
  });

  it("une case à cocher a toujours une cible de 1 ; sans programme, pas de fin", async () => {
    const db = fausseDb({ defis: [] });
    const d = await creerDefi(db, USER, { nom: "Pas de sucre", mesure: "case", cible: 40 });
    expect(d.cible).toBe(1);
    expect(d.fin).toBeNull();
  });

  it("refuse une fin avant le début", async () => {
    await expect(creerDefi(base(), USER, { nom: "Gainage", mesure: "minutes", debut: "2026-11-20", fin: "2026-11-19" })).rejects.toThrow(/avant son début/);
  });
});

describe("noterDefi", () => {
  it("valeur remplace, ajouter cumule (jamais sous 0), fait atteint la cible", async () => {
    const db = base();
    const { id } = await creerDefi(db, USER, { nom: "Marcher", mesure: "pas", cible: 8000 });
    expect(await noterDefi(db, USER, { defi_id: id, valeur: 3000 })).toMatchObject({ jour: "2026-11-18", valeur: 3000, atteint: false });
    expect(await noterDefi(db, USER, { defi_id: id, ajouter: 1000 })).toMatchObject({ valeur: 4000 });
    expect(await noterDefi(db, USER, { defi_id: id, ajouter: -9000 })).toMatchObject({ valeur: 0 });
    expect(await noterDefi(db, USER, { defi_id: id, fait: true })).toMatchObject({ valeur: 8000, atteint: true });
    expect(db.tables.defis_suivi).toHaveLength(1);
  });

  it("refuse un jour à venir et un jour où le défi ne vaut pas", async () => {
    const db = base();
    const { id } = await creerDefi(db, USER, { nom: "Gainage", mesure: "minutes", jours_semaine: [1, 3, 5], debut: "2026-11-16" });
    await expect(noterDefi(db, USER, { defi_id: id, jour: "2026-11-19", ajouter: 5 })).rejects.toThrow(/à venir/);
    await expect(noterDefi(db, USER, { defi_id: id, jour: "2026-11-17", ajouter: 5 })).rejects.toThrow(/ne vaut pas/);
    // Lundi passé : ok.
    expect(await noterDefi(db, USER, { defi_id: id, jour: "2026-11-16", ajouter: 10 })).toMatchObject({ atteint: true });
  });
});

describe("série et semaine", () => {
  it("la série compte les jours valables tenus d'affilée ; aujourd'hui pas encore fait ne la casse pas", () => {
    const d = { actif: true, debut: "2026-11-01", fin: null, jours_semaine: [1, 3, 5], cible: 10 };
    // lun. 9, mer. 11, ven. 13, lun. 16 tenus ; mer. 18 (aujourd'hui) pas encore.
    const v = new Map([
      ["2026-11-06", 0],
      ["2026-11-09", 10],
      ["2026-11-11", 12],
      ["2026-11-13", 10],
      ["2026-11-16", 10],
    ]);
    expect(serieDefi(d, v, "2026-11-18")).toBe(4);
    v.set("2026-11-18", 10);
    expect(serieDefi(d, v, "2026-11-18")).toBe(5);
    v.set("2026-11-13", 3);
    expect(serieDefi(d, v, "2026-11-18")).toBe(2);
  });

  it("listerDefis donne l'état du jour, la série et le bilan lun.–dim.", async () => {
    const db = base();
    const { id } = await creerDefi(db, USER, { nom: "Mobilité", mesure: "minutes", cible: 10, debut: "2026-11-16" });
    await noterDefi(db, USER, { defi_id: id, jour: "2026-11-16", valeur: 10 });
    await noterDefi(db, USER, { defi_id: id, jour: "2026-11-17", valeur: 15 });
    await noterDefi(db, USER, { defi_id: id, valeur: 5 });
    const [e] = await listerDefis(db, USER, "2026-11-18");
    expect(e).toMatchObject({ du_jour: true, valeur: 5, atteint: false, serie: 2, semaine: { atteints: 2, total: 7 }, unite: "min" });
    // La veille du début : il ne vaut pas encore.
    const [avant] = await listerDefis(db, USER, "2026-11-15");
    expect(avant).toMatchObject({ du_jour: false, a_venir: true });
  });

  it("un défi en pause ne vaut plus mais reste listé", async () => {
    const db = base();
    const { id } = await creerDefi(db, USER, { nom: "Pompes", mesure: "repetitions" });
    await modifierDefi(db, USER, { id, actif: false });
    const [e] = await listerDefis(db, USER);
    expect(e).toMatchObject({ actif: false, du_jour: false, serie: 0 });
    expect(defiValable({ actif: true, debut: "2026-11-18", fin: null, jours_semaine: [3] }, "2026-11-18")).toBe(true);
  });
});

describe("modifier et supprimer", () => {
  it("changer de mesure remet la cible par défaut de la nouvelle mesure ; passer en case met 1", async () => {
    const db = base();
    const { id } = await creerDefi(db, USER, { nom: "Bouger", mesure: "pas", cible: 7000 });
    expect(await modifierDefi(db, USER, { id, mesure: "minutes" })).toMatchObject({ cible: 10 });
    expect(await modifierDefi(db, USER, { id, cible: 30 })).toMatchObject({ cible: 30 });
    expect(await modifierDefi(db, USER, { id, mesure: "case" })).toMatchObject({ cible: 1 });
  });

  it("supprimer enlève le défi et son suivi ; la remise à zéro Sport aussi", async () => {
    const db = base();
    const a = await creerDefi(db, USER, { nom: "A", mesure: "case" });
    await creerDefi(db, USER, { nom: "B", mesure: "case" });
    await noterDefi(db, USER, { defi_id: a.id, fait: true });
    expect(await supprimerDefi(db, USER, a.id)).toEqual({ id: a.id, supprime: true });
    expect(db.tables.defis).toHaveLength(1);
    expect(db.tables.defis_suivi).toHaveLength(0);
    const r = await reinitialiserSport(db, USER);
    expect(r.supprime.defis).toBe(1);
    expect(db.tables.defis).toHaveLength(0);
  });
});

describe("outils", () => {
  it("creer_defi puis noter_defi puis lister_defis via executer()", async () => {
    const db = base();
    const ctx = { db, userId: USER };
    const d = await executer("creer_defi", { nom: "Marcher", mesure: "pas", cible: 10000 }, ctx);
    await executer("noter_defi", { defi_id: d.id, ajouter: 4000 }, ctx);
    const liste = await executer("lister_defis", {}, ctx);
    expect(liste[0]).toMatchObject({ nom: "Marcher", valeur: 4000, atteint: false, du_jour: true });
    expect(liste[0]).not.toHaveProperty("icone");
  });

  it("libellés de jours", () => {
    expect(libelleJours([1, 2, 3, 4, 5])).toBe("En semaine");
    expect(libelleJours([6, 0])).toBe("Le week-end");
    expect(libelleJours([0, 1, 3])).toBe("lun., mer., dim.");
  });
});
