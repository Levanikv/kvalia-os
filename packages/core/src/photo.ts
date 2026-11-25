/**
 * Estimation d'un repas à partir d'une photo : un modèle de vision décrit ce qu'il voit dans l'assiette (aliments,
 * grammes, calories, macros) et les règles d'ici nettoient sa réponse avant qu'elle n'arrive à l'écran ou au journal.
 * L'appel au modèle est injecté (`AnalyseurPhoto`) : `vision-claude.ts` en production, une fonction factice en test.
 * Rien n'est écrit ici : l'utilisateur ajuste, puis `ajouter_au_journal` note chaque élément (ADR 0015).
 */
import { z } from "zod";

export const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"] as const;

export const EntreePhotoRepas = z.object({
  image_base64: z.string().min(100).max(7_000_000).describe("La photo du repas, encodée en base64 (sans préfixe « data: »), 5 Mo au plus"),
  type_image: z.enum(TYPES_IMAGE).default("image/jpeg"),
  precision: z
    .string()
    .trim()
    .max(300)
    .optional()
    .describe("Ce que la photo ne montre pas : « riz complet », « cuit à l'huile d'olive », « assiette de 27 cm »"),
});
export type EntreePhotoRepas = z.input<typeof EntreePhotoRepas>;

/** Ce que le modèle doit rendre (sortie structurée) : pas de bornes ici, les règles les appliquent ensuite. */
export const ReponseVision = z.object({
  est_un_repas: z.boolean().describe("Faux si la photo ne montre ni aliment ni boisson"),
  plat: z.string().describe("Nom court du repas, en français : « Poulet, riz et brocolis »"),
  elements: z.array(
    z.object({
      libelle: z.string().describe("L'aliment, en français, avec sa préparation si elle compte : « Riz basmati cuit »"),
      quantite_g: z.number().describe("Poids estimé dans l'assiette, en grammes (ou millilitres pour une boisson)"),
      kcal: z.number(),
      prot: z.number().describe("Protéines en grammes"),
      gluc: z.number().describe("Glucides en grammes"),
      lip: z.number().describe("Lipides en grammes"),
    }),
  ),
  confiance: z.enum(["haute", "moyenne", "faible"]),
  remarque: z.string().describe("Une phrase : ce qui rend l'estimation incertaine, ou une chaîne vide"),
});
export type ReponseVision = z.infer<typeof ReponseVision>;

export const CONSIGNE_PHOTO = `Tu estimes les calories d'un repas à partir d'une photo, pour le journal alimentaire d'un sportif.

Décompose l'assiette en aliments distincts (un élément par aliment visible : la viande, le féculent, les légumes, la sauce, le pain, la boisson). Pour chacun, estime le poids réellement présent, en te servant des repères de taille de la photo (assiette standard de 26 cm, couverts, verre, main), puis les calories et les macros de cette quantité à partir des valeurs nutritionnelles usuelles de l'aliment tel qu'il est préparé (cuit, frit, en sauce).

Compte ce qui ne se voit pas mais se devine à la préparation : l'huile ou le beurre de cuisson, la vinaigrette, le fromage fondu. Ajoute-les comme éléments à part quand ils pèsent sur le total.

Quand tu hésites entre deux quantités, prends la valeur médiane plutôt que la plus basse : les portions photographiées sont plus souvent sous-estimées que surestimées. Indique une confiance « faible » quand le plat est mélangé (gratin, curry, bol) ou que la photo ne permet pas de juger les quantités, et dis pourquoi dans la remarque, en une phrase.

Si la photo ne montre ni aliment ni boisson, réponds est_un_repas = faux avec une liste d'éléments vide. Écris tout en français.`;

export type AnalyseurPhoto = (photo: { donnees: string; type: (typeof TYPES_IMAGE)[number]; precision?: string }) => Promise<unknown>;

const arrondi1 = (x: number) => Math.round(x * 10) / 10;
const borne = (x: number, max: number) => (Number.isFinite(x) ? Math.min(max, Math.max(0, x)) : 0);

export type ElementEstime = { libelle: string; quantite_g: number; kcal: number; prot: number; gluc: number; lip: number };

/**
 * Nettoie la réponse du modèle : éléments sans nom ou sans poids écartés, valeurs bornées, et calories recalculées
 * depuis les macros (4 / 4 / 9 kcal par g) quand elles s'en écartent de plus de 30 % — le modèle se trompe plus
 * volontiers sur un total que sur des grammes.
 */
export function nettoyerEstimation(brut: unknown) {
  const r = ReponseVision.parse(brut);
  const elements: ElementEstime[] = r.elements
    .map((e) => {
      const prot = arrondi1(borne(e.prot, 300));
      const gluc = arrondi1(borne(e.gluc, 500));
      const lip = arrondi1(borne(e.lip, 300));
      const depuisMacros = prot * 4 + gluc * 4 + lip * 9;
      const annonce = borne(e.kcal, 3000);
      const coherent = depuisMacros < 20 || Math.abs(annonce - depuisMacros) <= 0.3 * depuisMacros;
      return {
        libelle: e.libelle.trim().slice(0, 100),
        quantite_g: Math.round(borne(e.quantite_g, 3000)),
        kcal: Math.round(coherent ? annonce : depuisMacros),
        prot,
        gluc,
        lip,
      };
    })
    .filter((e) => e.libelle && e.quantite_g > 0)
    .slice(0, 15);
  if (!r.est_un_repas || !elements.length) throw new Error("Je ne vois pas de repas sur cette photo. Reprends-la de plus près, bien éclairée.");
  const somme = (c: "kcal" | "prot" | "gluc" | "lip") => elements.reduce((a, e) => a + e[c], 0);
  return {
    plat: r.plat.trim().slice(0, 120) || elements[0].libelle,
    elements,
    total: { kcal: Math.round(somme("kcal")), prot: arrondi1(somme("prot")), gluc: arrondi1(somme("gluc")), lip: arrondi1(somme("lip")) },
    confiance: r.confiance,
    remarque: r.remarque.trim().slice(0, 300),
  };
}
export type EstimationRepas = ReturnType<typeof nettoyerEstimation>;

export const SortiePhotoRepas = z.object({
  plat: z.string(),
  elements: z.array(z.object({ libelle: z.string(), quantite_g: z.number(), kcal: z.number(), prot: z.number(), gluc: z.number(), lip: z.number() })),
  total: z.object({ kcal: z.number(), prot: z.number(), gluc: z.number(), lip: z.number() }),
  confiance: z.enum(["haute", "moyenne", "faible"]),
  remarque: z.string(),
});

/** Photo → estimation nettoyée. Sans analyseur (clé du modèle absente), l'erreur dit quoi configurer. */
export async function estimerRepasPhoto(analyseur: AnalyseurPhoto | undefined, entree: EntreePhotoRepas): Promise<EstimationRepas> {
  const e = EntreePhotoRepas.parse(entree);
  if (!analyseur) throw new Error("L'analyse de photo n'est pas configurée : il manque la clé ANTHROPIC_API_KEY sur le serveur.");
  return nettoyerEstimation(await analyseur({ donnees: e.image_base64, type: e.type_image, precision: e.precision }));
}

/** Change la quantité d'un élément : calories et macros suivent en proportion. */
export function ajusterElement(e: ElementEstime, quantite_g: number): ElementEstime {
  const f = e.quantite_g > 0 ? quantite_g / e.quantite_g : 0;
  return {
    libelle: e.libelle,
    quantite_g: Math.round(quantite_g),
    kcal: Math.round(e.kcal * f),
    prot: arrondi1(e.prot * f),
    gluc: arrondi1(e.gluc * f),
    lip: arrondi1(e.lip * f),
  };
}
