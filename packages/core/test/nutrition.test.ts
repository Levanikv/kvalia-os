import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chercherAliments, codeBarresDepuisScan, depuisOpenFoodFacts, normaliser } from "../src/aliments";
import {
  ajouterAuJournal,
  budgetRepas,
  cibleMacros,
  classerSuggestions,
  derniersRepas,
  importerRecettesDeBase,
  journalDuJour,
  listerRecettes,
  parcoursRepas,
  repeterRepas,
  repasDuMoment,
  suggererRepas,
  supprimerDuJournal,
} from "../src/nutrition";
import { ajusterElement, estimerRepasPhoto, nettoyerEstimation } from "../src/photo";
import { RECETTES_BASE } from "../src/recettes-base";
import { executer } from "../src/actions";
import { USER, fausseDb } from "./fausse-db";

// « Maintenant » = mercredi 18 nov. 2026, 16 h 30 à Paris (l'heure de l'encas).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-18T15:30:00Z"));
});
afterEach(() => vi.useRealTimers());

const aliments = () => [
  {
    id: "ciqual:9125",
    source: "ciqual",
    nom: "Riz basmati, cuit, non salé",
    nom_recherche: "riz basmati cuit non sale",
    kcal: 117,
    prot: 2.7,
    gluc: 25,
    lip: 0.3,
    fibres: 0.6,
  },
  {
    id: "ciqual:9119",
    source: "ciqual",
    nom: "Riz thaï ou basmati, cru",
    nom_recherche: "riz thai ou basmati cru",
    kcal: 353,
    prot: 7,
    gluc: 78,
    lip: 0.6,
    fibres: 1,
  },
  { id: "ciqual:13005", source: "ciqual", nom: "Banane, pulpe, crue", nom_recherche: "banane pulpe crue", kcal: 90, prot: 1.1, gluc: 20, lip: 0.2, fibres: 2 },
];
const base = (plus: Record<string, any[]> = {}) =>
  fausseDb({
    aliments: aliments(),
    journal_repas: [],
    recettes: [],
    seances: [],
    programmes: [],
    profils: [{ id: USER, reglages: { nutrition: { cible_kcal: 2400, proteines_g: 160, ajuster_avec_sport: true } } }],
    ...plus,
  });

describe("aliments", () => {
  it("normalise : minuscules, sans accents ni ponctuation", () => {
    expect(normaliser("Pâtes à l'Œuf, crues")).toBe("pates a l uf crues");
    expect(normaliser("  Skyr   NATURE 0% ")).toBe("skyr nature 0");
  });

  it("recherche locale : tous les mots, le nom qui commence par la recherche d'abord", async () => {
    const r = await chercherAliments(base(), "riz basmati");
    expect(r.open_food_facts).toBe("ignore");
    expect(r.aliments.map((a) => a.id)).toEqual(["ciqual:9125", "ciqual:9119"]);
    expect((await chercherAliments(base(), "banane crue")).aliments).toHaveLength(1);
    expect((await chercherAliments(base(), "x")).aliments).toEqual([]);
  });

  it("Open Food Facts complète avec les produits de marque et les met en cache ; hors ligne, la base suffit", async () => {
    const db = base();
    const off = {
      code: "3329770077003",
      product_name_fr: "Skyr nature 0%",
      brands: "Yoplait, Autre",
      serving_quantity: "140",
      nutriscore_grade: "a",
      nutriments: { "energy-kcal_100g": 57, proteins_100g: 9.5, carbohydrates_100g: 3.6, fat_100g: 0.5 },
    };
    const fetch = async () => ({ ok: true, json: async () => ({ products: [off, { code: "1", product_name: "Sans énergie", nutriments: {} }] }) });
    const r = await chercherAliments(db, "skyr", { distant: true, fetch });
    expect(r.open_food_facts).toBe("consulte");
    expect(r.aliments).toEqual([expect.objectContaining({ id: "off:3329770077003", marque: "Yoplait", kcal: 57, portion_g: 140, nutriscore: "a" })]);
    expect(db.tables.aliments.some((a: any) => a.id === "off:3329770077003")).toBe(true);
    const panne = await chercherAliments(db, "riz", { distant: true, fetch: async () => Promise.reject(new Error("réseau")) });
    expect(panne.open_food_facts).toBe("indisponible");
    expect(panne.aliments.length).toBeGreaterThan(0);
    expect(depuisOpenFoodFacts({ code: "2", product_name: "Trop", nutriments: { "energy-kcal_100g": 4000 } })).toBeNull();
  });

  it("code-barres : la base d'abord, sinon la fiche Open Food Facts", async () => {
    const db = base();
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ product: { product_name: "Barre", nutriments: { "energy-kcal_100g": 400 } } }) }));
    expect((await chercherAliments(db, "3017620422003", { fetch })).aliments[0]).toMatchObject({ id: "off:3017620422003", kcal: 400 });
    await chercherAliments(db, "3017620422003", { fetch });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("scan : codes EAN / UPC et QR codes GS1 → code à chercher ; le reste est ignoré", () => {
    expect(codeBarresDepuisScan(" 3017620422003 ")).toBe("3017620422003");
    expect(codeBarresDepuisScan("96385074")).toBe("96385074");
    expect(codeBarresDepuisScan("https://id.gs1.org/01/03017620422003/10/LOT1?17=270101")).toBe("3017620422003");
    expect(codeBarresDepuisScan("(01)03017620422003(17)270101")).toBe("3017620422003");
    expect(codeBarresDepuisScan("https://exemple.fr/promo")).toBeNull();
    expect(codeBarresDepuisScan("1234")).toBeNull();
  });

  it("code-barres : un UPC à 12 chiffres retrouve la fiche rangée sur 13 ; énergie en kJ convertie", async () => {
    const db = base();
    const fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ product: { code: "0012345678905", product_name: "Beurre de cacahuète", nutriments: { "energy-kj_100g": 2510 } } }),
    }));
    expect((await chercherAliments(db, "012345678905", { fetch })).aliments[0]).toMatchObject({ id: "off:0012345678905", kcal: 600 });
    expect((await chercherAliments(db, "012345678905", { fetch })).aliments).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe("journal", () => {
  it("un aliment : macros = valeurs pour 100 g × quantité, figées dans la ligne ; repas du moment par défaut", async () => {
    const db = base();
    const l = await ajouterAuJournal(db, USER, { aliment_id: "ciqual:9125", quantite_g: 200 });
    expect(l).toMatchObject({ jour: "2026-11-18", repas: "encas", kcal: 234, prot: 5.4, gluc: 50 });
    expect(db.tables.journal_repas[0]).toMatchObject({ aliment_id: "ciqual:9125", quantite_g: 200, user_id: USER });
  });

  it("saisie libre et recette ; le journal regroupe par repas et calcule le reste", async () => {
    const db = base();
    await importerRecettesDeBase(db, USER);
    const poulet = db.tables.recettes.find((r: any) => r.ref === "base:poulet-riz-brocoli");
    await ajouterAuJournal(db, USER, { repas: "dejeuner", recette_id: poulet.id, portions: 1.5 });
    await ajouterAuJournal(db, USER, { repas: "petit_dej", libelle: "Croissant", kcal: 230, prot: 5 });
    const j = await journalDuJour(db, USER, "2026-11-18");
    expect(j.repas.map((r) => r.repas)).toEqual(["petit_dej", "collation", "dejeuner", "encas", "diner"]);
    expect(j.repas[2].kcal).toBe(Math.round(poulet.kcal * 1.5));
    expect(j.consomme).toBe(230 + Math.round(poulet.kcal * 1.5));
    expect(j.reste).toBe(2400 - j.consomme);
    expect(j.macros_cible).toEqual(cibleMacros(2400, 160));
    const id = j.repas[0].lignes[0].id;
    expect(await supprimerDuJournal(db, USER, id)).toEqual({ id, supprime: true });
    expect((await journalDuJour(db, USER, "2026-11-18")).repas[0].lignes).toHaveLength(0);
    await expect(ajouterAuJournal(db, USER, { libelle: "Sans calories" })).rejects.toThrow(/aliment|recette|saisie/);
  });

  it("le repas du moment suit l'heure de Paris", () => {
    expect(repasDuMoment(new Date("2026-11-18T06:30:00Z"))).toBe("petit_dej");
    expect(repasDuMoment(new Date("2026-11-18T10:00:00Z"))).toBe("collation");
    expect(repasDuMoment(new Date("2026-11-18T12:00:00Z"))).toBe("dejeuner");
    expect(repasDuMoment(new Date("2026-11-18T16:00:00Z"))).toBe("encas");
    expect(repasDuMoment(new Date("2026-11-18T19:30:00Z"))).toBe("diner");
  });
});

describe("recettes de départ", () => {
  it("s'importent une seule fois, avec macros, repas et étiquettes cohérents", async () => {
    const db = base();
    expect(await importerRecettesDeBase(db, USER)).toBe(RECETTES_BASE.length);
    expect(await importerRecettesDeBase(db, USER)).toBe(0);
    const liste = await listerRecettes(db, USER, { repas: "petit_dej" });
    expect(liste.length).toBeGreaterThan(4);
    for (const r of RECETTES_BASE) {
      // L'énergie annoncée colle aux macros (4 / 4 / 9 kcal par g), à 12 % près (fibres, arrondis).
      const calcule = r.prot * 4 + r.gluc * 4 + r.lip * 9;
      expect(Math.abs(calcule - r.kcal) / r.kcal, r.nom).toBeLessThan(0.12);
      expect(r.repas.length, r.nom).toBeGreaterThan(0);
      expect(r.ingredients.length, r.nom).toBeGreaterThan(0);
    }
  });
});

describe("suggestions", () => {
  const recettes = RECETTES_BASE.map((r, i) => ({ id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`, ...r }));
  const sport = { objectif: null, seance_a_venir: false, seance_faite: false };

  it("300 kcal pour un encas : des encas sous le budget, les plus protéinés d'abord quand il manque des protéines", () => {
    const s = classerSuggestions(recettes, { repas: "encas", budget_kcal: 300, reste_proteines: 60, sport });
    expect(s.length).toBeGreaterThan(0);
    for (const x of s) {
      expect(x.kcal).toBeLessThanOrEqual(330);
      expect(x.repas.some((r) => r === "encas" || r === "collation")).toBe(true);
    }
    expect(s[0].prot).toBeGreaterThanOrEqual(20);
  });

  it("le sport change le classement : glucides avant la séance, récupération après, léger en sèche", () => {
    const avant = classerSuggestions(recettes, { repas: "encas", budget_kcal: 240, reste_proteines: 0, sport: { ...sport, seance_a_venir: true } });
    expect(avant[0].tags).toContain("avant_seance");
    expect(avant[0].raison).toMatch(/avant ta séance/);
    const apres = classerSuggestions(recettes, { repas: "encas", budget_kcal: 240, reste_proteines: 0, sport: { ...sport, seance_faite: true } });
    expect(apres[0].tags).toContain("apres_seance");
    const seche = classerSuggestions(recettes, { repas: "diner", budget_kcal: 520, reste_proteines: 40, sport: { ...sport, objectif: "perte_de_gras" } });
    expect(seche[0].tags).toContain("seche");
  });

  it("un dîner ne propose que des plats ; rien sous 80 kcal ; les portions s'ajustent au budget", () => {
    const diner = classerSuggestions(recettes, { repas: "diner", budget_kcal: 600, reste_proteines: 50, sport });
    expect(diner.every((x) => x.repas.includes("diner"))).toBe(true);
    expect(classerSuggestions(recettes, { repas: "diner", budget_kcal: 60, reste_proteines: 50, sport })).toEqual([]);
    const gros = classerSuggestions(recettes, { repas: "encas", budget_kcal: 450, reste_proteines: 0, sport, max: 10 });
    expect(gros.some((x) => x.portions > 1)).toBe(true);
  });

  it("le budget réserve les repas principaux à venir et se plafonne à la part du repas", () => {
    // Matin, rien de saisi : on garde de quoi déjeuner et dîner.
    expect(budgetRepas({ repas: "petit_dej", cible: 2400, reste: 2400, repas_saisis: [] })).toBe(840);
    // Encas avec le dîner à venir : reste − dîner réservé, plafonné à 1,4 × 10 %.
    expect(budgetRepas({ repas: "encas", cible: 2400, reste: 900, repas_saisis: ["petit_dej", "dejeuner"] })).toBe(300);
    // Le soir, il reste 300 kcal : tout le reste.
    expect(budgetRepas({ repas: "diner", cible: 2400, reste: 300, repas_saisis: ["petit_dej", "dejeuner"] })).toBe(300);
    // Journée chargée : petit budget plutôt que rien ; cible atteinte : 0.
    expect(budgetRepas({ repas: "encas", cible: 2400, reste: 500, repas_saisis: ["petit_dej"] })).toBe(150);
    expect(budgetRepas({ repas: "diner", cible: 2400, reste: -50, repas_saisis: [] })).toBe(0);
  });

  it("suggerer_repas (outil) : lit le reste du jour, la séance et le programme", async () => {
    const db = base({
      programmes: [{ id: "p1", user_id: USER, actif: true, rythme: { objectif: "hypertrophie" } }],
      seances: [{ id: "s1", user_id: USER, jour: "2026-11-18", etat: "faite", type: "upper", titre: "Upper A", kcal: 400 }],
    });
    await ajouterAuJournal(db, USER, { repas: "petit_dej", libelle: "Petit-déjeuner", kcal: 600, prot: 30 });
    await ajouterAuJournal(db, USER, { repas: "dejeuner", libelle: "Déjeuner", kcal: 800, prot: 50 });
    const r = await executer("suggerer_repas", {}, { db, userId: USER });
    expect(r.repas).toBe("encas");
    expect(r.reste_kcal).toBe(2400 + 400 - 1400);
    expect(r.sport).toEqual({ objectif: "hypertrophie", seance_a_venir: false, seance_faite: true });
    expect(r.budget_kcal).toBe(392);
    expect(r.suggestions[0].tags).toContain("apres_seance");
    expect(r.message).toMatch(/Il te reste 1.400 kcal et 80 g de protéines/);
    const force = await suggererRepas(db, USER, { repas: "diner", budget_kcal: 300 });
    expect(force.budget_kcal).toBe(300);
    expect(force.suggestions.every((x) => x.kcal <= 330)).toBe(true);
  });
});

describe("parcours du jour", () => {
  const journal = (saisis: Record<string, number>) => ({
    cible: 2400,
    reste: 2400 - Object.values(saisis).reduce((a, b) => a + b, 0),
    repas: (["petit_dej", "collation", "dejeuner", "encas", "diner"] as const).map((r) => ({ repas: r, kcal: saisis[r] ?? 0, lignes: saisis[r] ? [{}] : [] })),
  });

  it("états : noté, passé sans rien, maintenant, à venir — et calories conseillées tant que rien n'est noté", () => {
    const p = parcoursRepas(journal({ petit_dej: 500 }), "dejeuner");
    expect(p.focus).toBe("dejeuner");
    expect(p.repas.map((r) => r.etat)).toEqual(["note", "passe", "maintenant", "a_venir", "a_venir"]);
    // Déjeuner : reste 1 900 − dîner réservé (600) = 1 300, plafonné à 1,4 × 32 % de 2 400.
    expect(p.repas[2].conseille_kcal).toBe(1075);
    expect(p.repas[0].conseille_kcal).toBe(0);
    expect(p.repas[4].conseille_kcal).toBeGreaterThan(0);
  });

  it("un autre jour qu'aujourd'hui : rien n'est « maintenant », les repas vides sont passés", () => {
    const p = parcoursRepas(journal({ diner: 700 }), null);
    expect(p.focus).toBeNull();
    expect(p.repas.map((r) => r.etat)).toEqual(["passe", "passe", "passe", "passe", "note"]);
  });

  it("refaire un repas : recopie la dernière occurrence, macros comprises ; erreur claire s'il n'y a rien", async () => {
    const ligne = (jour: string, repas: string, libelle: string, kcal: number) => ({
      user_id: USER,
      jour,
      repas,
      libelle,
      kcal,
      prot: 10,
      gluc: 20,
      lip: 5,
      portions: 1,
    });
    const db = base({
      journal_repas: [
        ligne("2026-11-15", "petit_dej", "Vieux porridge", 400),
        ligne("2026-11-17", "petit_dej", "Skyr", 120),
        ligne("2026-11-17", "petit_dej", "Banane", 90),
        ligne("2026-11-17", "diner", "Poulet riz", 650),
      ],
    });
    const derniers = await derniersRepas(db, USER, "2026-11-18");
    expect(derniers.petit_dej).toEqual({ jour: "2026-11-17", kcal: 210, libelles: ["Skyr", "Banane"] });
    expect(derniers.dejeuner).toBeUndefined();
    const r = await executer("repeter_repas", { repas: "petit_dej" }, { db, userId: USER });
    expect(r).toEqual({ jour: "2026-11-18", repas: "petit_dej", depuis: "2026-11-17", lignes: 2, kcal: 210 });
    const j = await journalDuJour(db, USER, "2026-11-18");
    expect(j.repas[0]).toMatchObject({ kcal: 210 });
    expect(j.repas[0].lignes.map((l) => l.libelle)).toEqual(["Skyr", "Banane"]);
    await expect(repeterRepas(db, USER, { repas: "dejeuner" })).rejects.toThrow("rien à refaire");
  });
});

describe("photo d'un repas", () => {
  const image_base64 = "A".repeat(200);
  const vu = {
    est_un_repas: true,
    plat: "Poulet, riz et brocolis",
    elements: [
      { libelle: "Blanc de poulet grillé", quantite_g: 150, kcal: 248, prot: 46, gluc: 0, lip: 5.4 },
      // Calories annoncées incohérentes avec les macros (≈ 234) : recalculées.
      { libelle: "Riz basmati cuit", quantite_g: 180, kcal: 900, prot: 4.9, gluc: 52, lip: 0.7 },
      { libelle: "", quantite_g: 50, kcal: 10, prot: 0, gluc: 2, lip: 0 },
      { libelle: "Brocolis vapeur", quantite_g: 0, kcal: 0, prot: 0, gluc: 0, lip: 0 },
    ],
    confiance: "moyenne",
    remarque: "Huile de cuisson non visible.",
  };

  it("nettoie la réponse du modèle : éléments vides écartés, calories recalculées si incohérentes, total", async () => {
    const analyseur = vi.fn(async () => vu);
    const r = await executer("estimer_repas_photo", { image_base64, precision: "riz basmati" }, { db: base(), userId: USER, vision: analyseur });
    expect(analyseur).toHaveBeenCalledWith({ donnees: image_base64, type: "image/jpeg", precision: "riz basmati" });
    expect(r.elements.map((e) => e.libelle)).toEqual(["Blanc de poulet grillé", "Riz basmati cuit"]);
    expect(r.elements[1].kcal).toBe(234);
    expect(r.total).toEqual({ kcal: 482, prot: 50.9, gluc: 52, lip: 6.1 });
    expect(r.confiance).toBe("moyenne");
  });

  it("pas un repas, réponse hors schéma ou analyse non configurée : erreurs claires", async () => {
    expect(() => nettoyerEstimation({ ...vu, est_un_repas: false, elements: [] })).toThrow("pas de repas");
    expect(() => nettoyerEstimation({ plat: "?" })).toThrow();
    await expect(estimerRepasPhoto(undefined, { image_base64 })).rejects.toThrow("ANTHROPIC_API_KEY");
  });

  it("ajuster la quantité d'un élément : calories et macros suivent en proportion", () => {
    expect(ajusterElement({ libelle: "Riz", quantite_g: 180, kcal: 234, prot: 4.9, gluc: 52, lip: 0.7 }, 90)).toEqual({
      libelle: "Riz",
      quantite_g: 90,
      kcal: 117,
      prot: 2.5,
      gluc: 26,
      lip: 0.4,
    });
  });
});
