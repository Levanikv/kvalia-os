import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { CLASSIQUES, ILLUSTRATIONS, illustrationPour } from "../src";
import { exercicesRef } from "./fausse-db";

const DOSSIER = join(dirname(fileURLToPath(import.meta.url)), "../../../apps/web/public/illustrations");

describe("illustrations d'exercices", () => {
  it("chaque illustration référencée a son fichier, avec 2 ou 3 poses dans le cadre 512×512", () => {
    for (const slug of new Set(Object.values(ILLUSTRATIONS))) {
      const fichier = join(DOSSIER, `${slug}.json`);
      expect(existsSync(fichier), slug).toBe(true);
      const { poses } = JSON.parse(readFileSync(fichier, "utf8")) as { poses: string[] };
      expect(poses.length, slug).toBeGreaterThanOrEqual(2);
      expect(poses.length, slug).toBeLessThanOrEqual(3);
      for (const pose of poses) expect(pose, slug).toMatch(/^M[\d a-zA-Z.-]+$/);
    }
  });

  it("ne référence que des exercices du référentiel", () => {
    const noms = new Set(exercicesRef().map((e) => String(e.nom)));
    expect(Object.keys(ILLUSTRATIONS).filter((nom) => !noms.has(nom))).toEqual([]);
  });

  it("associe le bon matériel au bon dessin", () => {
    expect(illustrationPour("Barbell Bench Press")).toBe("bench-press");
    expect(illustrationPour("Dumbbell Bench Press")).toBe("dumbbell-bench-press");
    expect(illustrationPour("Smith Bench Press")).toBe("smith-machine-bench-press");
    expect(illustrationPour("Lever Chest Press")).toBe("machine-chest-press");
    expect(illustrationPour("Lever Seated Fly")).toBe("pec-deck");
    expect(illustrationPour("Dumbbell Biceps Curl")).toBe("bicep-curl");
    expect(illustrationPour("Cable Curl")).toBe("cable-curl");
    expect(illustrationPour("Cable Pushdown")).toBe("tricep-pushdown");
    expect(illustrationPour("Cable Pushdown (With Rope Attachment)")).toBe("rope-tricep-pushdown");
    expect(illustrationPour("Sled 45° Leg Press")).toBe("leg-press");
    expect(illustrationPour("Lever Leg Extension")).toBe("leg-extension");
  });

  it("préfère l'absence d'illustration à un dessin approximatif", () => {
    // « Air Bike » est chez nous le crunch bicyclette, pas le vélo à air du catalogue d'origine.
    expect(illustrationPour("Air Bike")).toBe("bicycle-crunch");
    // Même mouvement mais autre matériel que le dessin disponible : rien.
    expect(illustrationPour("Cable Bench Press")).toBeNull();
    expect(illustrationPour("Cable Side Bend")).toBeNull();
    expect(illustrationPour("Exercice inconnu")).toBeNull();
    expect(illustrationPour("constructor")).toBeNull();
  });

  it("couvre l'essentiel des exercices classiques du générateur", () => {
    const classiques = [...new Set(Object.values(CLASSIQUES).flat())];
    const couverts = classiques.filter((nom) => illustrationPour(nom));
    // Les classiques sans dessin au même matériel dans la source sont listés dans docs/credits-illustrations.md.
    expect(couverts.length / classiques.length).toBeGreaterThanOrEqual(0.85);
  });
});
