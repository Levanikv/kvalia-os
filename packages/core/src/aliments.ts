/**
 * Base d'aliments : recherche dans le référentiel (`aliments`) — table CIQUAL 2020 de l'ANSES pour les aliments
 * génériques — complétée par Open Food Facts pour les produits de marque et les codes-barres. Ce qui vient d'Open
 * Food Facts est mis en cache dans `aliments` (source « off ») à la recherche, pour avoir un identifiant stable.
 * `fetch` est injectable (tests sans réseau). Valeurs pour 100 g.
 *
 * Sources : https://ciqual.anses.fr (licence ouverte) · https://world.openfoodfacts.org (ODbL).
 */
import { z } from "zod";
import type { TablesInsert } from "./database.types";
import type { KvaliaClient } from "./supabase";

export const AlimentSortie = z.object({
  id: z.string(),
  nom: z.string(),
  marque: z.string().nullable(),
  source: z.string().describe("ciqual (aliment générique), off (produit Open Food Facts) ou perso"),
  kcal: z.number().describe("pour 100 g"),
  prot: z.number(),
  gluc: z.number(),
  lip: z.number(),
  fibres: z.number().nullable(),
  portion_g: z.number().nullable().describe("Portion usuelle en grammes, si connue"),
  portion_nom: z.string().nullable(),
  nutriscore: z.string().nullable(),
});
export type AlimentSortie = z.infer<typeof AlimentSortie>;

const COLONNES = "id, nom, marque, source, kcal, prot, gluc, lip, fibres, portion_g, portion_nom, nutriscore, nom_recherche";

/** Minuscules, sans accents ni ponctuation : la forme stockée dans `aliments.nom_recherche`. */
export function normaliser(texte: string): string {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type FetchLike = (url: string, init?: { signal?: AbortSignal; headers?: Record<string, string> }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

const OFF = "https://world.openfoodfacts.org";
const CHAMPS_OFF = "code,product_name_fr,product_name,brands,nutriments,serving_quantity,serving_size,nutriscore_grade";
const ENTETES = { "User-Agent": "kvalia-os/1.0 (application personnelle)" };

type ProduitOff = {
  code?: string;
  product_name_fr?: string;
  product_name?: string;
  brands?: string;
  nutriments?: Record<string, unknown>;
  serving_quantity?: unknown;
  serving_size?: string;
  nutriscore_grade?: string;
};

const nombre = (v: unknown): number | null => {
  const n = typeof v === "string" ? Number(v.replace(",", ".")) : typeof v === "number" ? v : Number.NaN;
  return Number.isFinite(n) ? n : null;
};

/** Produit Open Food Facts → ligne `aliments`, ou `null` s'il manque le nom ou l'énergie. */
export function depuisOpenFoodFacts(p: ProduitOff): TablesInsert<"aliments"> | null {
  const nom = (p.product_name_fr || p.product_name || "").trim();
  const n = p.nutriments ?? {};
  // Certaines fiches n'ont que l'énergie en kilojoules.
  const kj = nombre(n["energy-kj_100g"]) ?? nombre(n.energy_100g);
  const kcal = nombre(n["energy-kcal_100g"]) ?? (kj === null ? null : kj / 4.184);
  if (!p.code || !nom || kcal === null || kcal < 0 || kcal > 950) return null;
  const arrondi = (v: unknown) => {
    const x = nombre(v);
    return x === null ? null : Math.round(x * 10) / 10;
  };
  const portion = nombre(p.serving_quantity);
  const marque = (p.brands ?? "").split(",")[0]?.trim() || null;
  return {
    id: `off:${p.code}`,
    source: "off",
    nom: nom.slice(0, 200),
    nom_recherche: normaliser(`${nom} ${marque ?? ""}`),
    marque,
    kcal: Math.round(kcal),
    prot: arrondi(n.proteins_100g) ?? 0,
    gluc: arrondi(n.carbohydrates_100g) ?? 0,
    lip: arrondi(n.fat_100g) ?? 0,
    sucres: arrondi(n.sugars_100g),
    fibres: arrondi(n.fiber_100g),
    sel: arrondi(n.salt_100g),
    satures: arrondi(n["saturated-fat_100g"]),
    portion_g: portion && portion > 0 && portion < 2000 ? portion : null,
    portion_nom: p.serving_size?.slice(0, 60) ?? null,
    code_barres: p.code,
    nutriscore: p.nutriscore_grade && /^[a-e]$/.test(p.nutriscore_grade) ? p.nutriscore_grade : null,
  };
}

/**
 * Ce que lit la caméra → code-barres à chercher, ou `null` si ce n'est pas un code produit.
 * Accepte les codes EAN / UPC (8 à 14 chiffres) et les QR codes GS1 (« …/01/03017620422003… ») ; un GTIN-14 qui
 * commence par 0 est ramené à l'EAN-13 imprimé sur l'emballage.
 */
export function codeBarresDepuisScan(lu: string): string | null {
  const texte = lu.trim();
  const gs1 = texte.match(/(?:\/01\/|^\(01\)|^01)(\d{14})(?!\d)/);
  const brut = gs1 ? gs1[1] : texte.replace(/[\s-]/g, "");
  if (!/^\d{8,14}$/.test(brut)) return null;
  return brut.length === 14 && brut.startsWith("0") ? brut.slice(1) : brut;
}

/** Les écritures d'un même code : tel que lu, et complété à 13 chiffres (un UPC à 12 chiffres est rangé ainsi). */
const variantesCode = (code: string) => [...new Set([code, code.length < 13 && code.length > 8 ? code.padStart(13, "0") : code])];

async function interrogerOff(url: string, fetchImpl: FetchLike): Promise<ProduitOff[]> {
  const rep = await fetchImpl(url, { signal: AbortSignal.timeout(7000), headers: ENTETES });
  if (!rep.ok) return [];
  const corps = (await rep.json()) as { products?: ProduitOff[]; product?: ProduitOff };
  return corps.products ?? (corps.product ? [corps.product] : []);
}

function versSortie(a: Record<string, unknown>): AlimentSortie {
  return {
    id: String(a.id),
    nom: String(a.nom),
    marque: (a.marque as string | null) ?? null,
    source: String(a.source),
    kcal: Number(a.kcal),
    prot: Number(a.prot ?? 0),
    gluc: Number(a.gluc ?? 0),
    lip: Number(a.lip ?? 0),
    fibres: a.fibres == null ? null : Number(a.fibres),
    portion_g: a.portion_g == null ? null : Number(a.portion_g),
    portion_nom: (a.portion_nom as string | null) ?? null,
    nutriscore: (a.nutriscore as string | null) ?? null,
  };
}

export type ResultatRecherche = {
  aliments: AlimentSortie[];
  /** Open Food Facts : consulté, ignoré (recherche locale suffisante ou désactivée) ou injoignable. */
  open_food_facts: "consulte" | "ignore" | "indisponible";
};

/**
 * Cherche un aliment par son nom (tous les mots doivent y figurer) ou par code-barres (8 à 14 chiffres).
 * Les aliments génériques (CIQUAL) sortent d'abord ; Open Food Facts complète avec les produits de marque quand
 * `distant` est vrai — toujours pour un code-barres.
 */
export async function chercherAliments(
  db: KvaliaClient,
  requete: string,
  options: { limite?: number; distant?: boolean; fetch?: FetchLike } = {},
): Promise<ResultatRecherche> {
  const limite = options.limite ?? 25;
  const q = normaliser(requete);
  const fetchImpl = options.fetch ?? (globalThis.fetch as unknown as FetchLike | undefined);
  const code = requete.replace(/\s/g, "");

  // Code-barres : la base d'abord, sinon la fiche produit d'Open Food Facts.
  if (/^\d{8,14}$/.test(code)) {
    const { data: connu, error } = await db.from("aliments").select(COLONNES).in("code_barres", variantesCode(code)).limit(1);
    if (error) throw error;
    if (connu?.length) return { aliments: connu.map(versSortie), open_food_facts: "ignore" };
    if (!fetchImpl) return { aliments: [], open_food_facts: "indisponible" };
    try {
      const produits = await interrogerOff(`${OFF}/api/v2/product/${code}.json?fields=${CHAMPS_OFF}`, fetchImpl);
      const lignes = produits.map((p) => depuisOpenFoodFacts({ ...p, code: p.code ?? code })).filter((x): x is TablesInsert<"aliments"> => x !== null);
      if (lignes.length) await db.from("aliments").upsert(lignes, { onConflict: "id" });
      return { aliments: lignes.map(versSortie), open_food_facts: "consulte" };
    } catch {
      return { aliments: [], open_food_facts: "indisponible" };
    }
  }

  const mots = q
    .split(" ")
    .filter((m) => m.length >= 2)
    .slice(0, 5);
  if (!mots.length) return { aliments: [], open_food_facts: "ignore" };
  let locale = db.from("aliments").select(COLONNES);
  for (const m of mots) locale = locale.ilike("nom_recherche", `%${m}%`);
  const { data: trouves, error } = await locale.limit(80);
  if (error) throw error;
  // Les plus proches d'abord : nom qui commence par la recherche, aliments génériques, noms courts.
  const rang = (a: Record<string, unknown>) => {
    const n = String(a.nom_recherche);
    return (n.startsWith(q) ? 0 : n.startsWith(mots[0]) ? 1 : 2) * 1000 + (a.source === "ciqual" ? 0 : 200) + Math.min(199, n.length);
  };
  const locaux = [...(trouves ?? [])].sort((a, b) => rang(a) - rang(b));

  if (!options.distant || !fetchImpl) return { aliments: locaux.slice(0, limite).map(versSortie), open_food_facts: "ignore" };
  try {
    const url = `${OFF}/cgi/search.pl?search_terms=${encodeURIComponent(requete.trim())}&search_simple=1&action=process&json=1&page_size=20&lc=fr&cc=fr&fields=${CHAMPS_OFF}`;
    const produits = await interrogerOff(url, fetchImpl);
    const lignes = produits.map(depuisOpenFoodFacts).filter((x): x is TablesInsert<"aliments"> => x !== null);
    // Open Food Facts renvoie large : les produits dont le nom contient vraiment les mots cherchés passent devant.
    const contient = (l: TablesInsert<"aliments">) => mots.every((m) => l.nom_recherche.includes(m));
    const nouveaux = lignes.filter((l) => !locaux.some((a) => a.id === l.id)).sort((a, b) => Number(contient(b)) - Number(contient(a)));
    if (lignes.length) await db.from("aliments").upsert(lignes, { onConflict: "id" });
    // Génériques d'abord (quelques-uns), puis les produits de marque, puis le reste.
    const tete = locaux.filter((a) => a.source === "ciqual").slice(0, 8);
    const reste = locaux.filter((a) => !tete.includes(a));
    const fusion = [...tete.map(versSortie), ...nouveaux.map(versSortie), ...reste.map(versSortie)];
    return { aliments: fusion.slice(0, limite + 10), open_food_facts: "consulte" };
  } catch {
    return { aliments: locaux.slice(0, limite).map(versSortie), open_food_facts: "indisponible" };
  }
}

/** Un aliment par son identifiant, ou `null`. */
export async function aliment(db: KvaliaClient, id: string): Promise<AlimentSortie | null> {
  const { data, error } = await db.from("aliments").select(COLONNES).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? versSortie(data) : null;
}
