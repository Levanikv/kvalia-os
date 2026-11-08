import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type KvaliaClient = SupabaseClient<Database>;

/**
 * Client côté serveur avec la clé service role (apps/agent, jobs).
 * Jamais importé par le navigateur.
 */
export function createServiceClient(
  url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
): KvaliaClient {
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants");
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * Client « au nom de l'utilisateur » : on passe son JWT, la RLS fait le reste.
 * À utiliser dans les routes API et dans les outils MCP quand l'appel vient d'un utilisateur authentifié.
 */
export function createUserClient(
  accessToken: string,
  url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
): KvaliaClient {
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquants");
  return createClient<Database>(url, key, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
