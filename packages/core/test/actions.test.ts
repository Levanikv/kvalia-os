import { describe, expect, it } from "vitest";
import { aujourdhuiIso, resoudreDate } from "../src/actions";
import { tools, toolsAvecConfirmation } from "../src/tools";

describe("aujourdhuiIso", () => {
  it("rend la date calendaire à Paris, pas UTC", () => {
    // 23:30 UTC le 7 nov. = 00:30 le 8 nov. à Paris (UTC+1)
    expect(aujourdhuiIso(new Date("2026-11-07T23:30:00Z"))).toBe("2026-11-08");
    expect(aujourdhuiIso(new Date("2026-11-08T10:00:00Z"))).toBe("2026-11-08");
  });
});

describe("resoudreDate", () => {
  const base = new Date("2026-11-08T12:00:00"); // dimanche
  it("comprend demain, les jours de la semaine, jj/mm et ISO", () => {
    expect(resoudreDate("demain", base)).toBe("2026-11-09");
    expect(resoudreDate("après-demain", base)).toBe("2026-11-10");
    expect(resoudreDate("mardi", base)).toBe("2026-11-10");
    expect(resoudreDate("25/12", base)).toBe("2026-12-25");
    expect(resoudreDate("2027-01-04", base)).toBe("2027-01-04");
  });
  it("rend null quand il ne comprend pas", () => {
    expect(resoudreDate("bientôt", base)).toBeNull();
    expect(resoudreDate(undefined, base)).toBeNull();
  });
});

describe("contrat des outils", () => {
  it("chaque outil a une description, un schéma d'entrée objet et un schéma de sortie", () => {
    for (const [nom, def] of Object.entries(tools)) {
      expect(def.description.length, nom).toBeGreaterThan(20);
      expect(def.input._def.typeName, nom).toBe("ZodObject");
      expect(def.output, nom).toBeDefined();
    }
  });
  it("les outils à confirmation existent dans le contrat", () => {
    for (const nom of toolsAvecConfirmation) expect(Object.keys(tools)).toContain(nom);
  });
  it("les noms sont en français, snake_case", () => {
    for (const nom of Object.keys(tools)) expect(nom).toMatch(/^[a-z][a-z0-9_]*$/);
  });
});
