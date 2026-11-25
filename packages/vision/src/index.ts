/**
 * L'analyseur de photo de production : Claude (vision) avec une sortie structurée, pour `estimer_repas_photo`.
 * Paquet à part, serveur uniquement (clé ANTHROPIC_API_KEY) : le noyau reste sans SDK et importable côté navigateur.
 * Utilisé par la server action de Nutrition et par l'agent, qui le passent à `executer()` dans `vision`.
 */
import Anthropic from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { type AnalyseurPhoto, CONSIGNE_PHOTO } from "@kvalia/core";

const MODELE = "claude-opus-5-5";

const nombre = (description?: string) => ({ type: "number", ...(description ? { description } : {}) }) as const;
/** Le schéma `ReponseVision` du noyau (`photo.ts`), en JSON Schema pour la sortie structurée (la réponse est revalidée par zod ensuite). */
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["est_un_repas", "plat", "elements", "confiance", "remarque"],
  properties: {
    est_un_repas: { type: "boolean", description: "Faux si la photo ne montre ni aliment ni boisson" },
    plat: { type: "string", description: "Nom court du repas, en français" },
    elements: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["libelle", "quantite_g", "kcal", "prot", "gluc", "lip"],
        properties: {
          libelle: { type: "string", description: "L'aliment, en français, avec sa préparation si elle compte" },
          quantite_g: nombre("Poids estimé dans l'assiette, en grammes (ou millilitres pour une boisson)"),
          kcal: nombre(),
          prot: nombre("Protéines en grammes"),
          gluc: nombre("Glucides en grammes"),
          lip: nombre("Lipides en grammes"),
        },
      },
    },
    confiance: { type: "string", enum: ["haute", "moyenne", "faible"] },
    remarque: { type: "string", description: "Une phrase : ce qui rend l'estimation incertaine, ou une chaîne vide" },
  },
} as const;

/** `undefined` quand aucune clé n'est configurée : l'outil répond alors par une erreur claire. */
export function analyseurClaude(): AnalyseurPhoto | undefined {
  if (!process.env.ANTHROPIC_API_KEY) return undefined;
  const client = new Anthropic({ timeout: 60_000, maxRetries: 1 });
  return async ({ donnees, type, precision }) => {
    try {
      const reponse = await client.beta.messages.parse({
        model: MODELE,
        max_tokens: 8000,
        // Si le modèle décline la demande, l'API la rejoue d'elle-même sur un modèle de repli.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        // Lecture d'une assiette : peu de raisonnement, une réponse rapide sur le téléphone.
        output_config: { effort: "low", format: jsonSchemaOutputFormat(SCHEMA) },
        system: CONSIGNE_PHOTO,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: type, data: donnees } },
              { type: "text", text: precision ? `Estime ce repas. Précision donnée par la personne : ${precision}` : "Estime ce repas." },
            ],
          },
        ],
      });
      if (reponse.stop_reason === "refusal") throw new Error("L'analyse a été refusée pour cette photo. Passe par la recherche ou la saisie rapide.");
      if (!reponse.parsed_output) throw new Error("L'analyse n'a pas abouti. Réessaie avec une photo plus nette.");
      return reponse.parsed_output;
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError) throw new Error("La clé ANTHROPIC_API_KEY est refusée : vérifie-la dans Railway.");
      if (e instanceof Anthropic.RateLimitError) throw new Error("Trop d'analyses d'un coup : réessaie dans une minute.");
      if (e instanceof Anthropic.BadRequestError) throw new Error("Cette photo n'a pas pu être lue. Reprends-la, ou passe par la recherche.");
      if (e instanceof Anthropic.APIConnectionError) throw new Error("Le service d'analyse ne répond pas. Réessaie dans un instant.");
      if (e instanceof Anthropic.APIError) throw new Error(`L'analyse a échoué (erreur ${e.status ?? "inconnue"}). Réessaie.`);
      throw e;
    }
  };
}
