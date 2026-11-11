/**
 * Client Tiime de l'agent (ADR 0010) : un seul par processus, pour qu'une connexion SMS lancée par `connecter_tiime`
 * soit encore là quand `valider_code_tiime` arrive (le serveur MCP est stateless, le processus ne l'est pas).
 * Les secrets ne vivent qu'ici : TIIME_EMAIL, TIIME_PASSWORD, TIIME_SOCIETE_ID (Railway, service agent).
 */
import { AuthTiime, ClientTiime, type KvaliaClient, stockageJetonsSupabase } from "@kvalia/core";

export type ContexteTiime = { auth: AuthTiime; client: ClientTiime };

let cache: ContexteTiime | null | undefined;

/** `null` si Tiime n'est pas configuré (TIIME_SOCIETE_ID absent) : les outils Tiime répondent alors une erreur claire. */
export function contexteTiime(db: KvaliaClient, userId: string): ContexteTiime | null {
  if (cache !== undefined) return cache;
  const societeId = Number(process.env.TIIME_SOCIETE_ID);
  if (!Number.isInteger(societeId) || societeId <= 0) {
    cache = null;
    return cache;
  }
  const auth = new AuthTiime({
    email: process.env.TIIME_EMAIL?.trim() || undefined,
    motDePasse: process.env.TIIME_PASSWORD || undefined,
    stockage: stockageJetonsSupabase(db, userId),
  });
  cache = { auth, client: new ClientTiime(auth, { societeId, versionApp: process.env.TIIME_APP_VERSION?.trim() || undefined }) };
  return cache;
}
