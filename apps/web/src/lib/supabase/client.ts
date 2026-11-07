"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@kvalia/core";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Client Supabase côté navigateur (singleton) : auth, Realtime. */
export function createClient() {
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_KEY);
  return client;
}
