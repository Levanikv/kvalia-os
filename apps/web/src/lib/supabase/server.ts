import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@kvalia/core";
import { SUPABASE_KEY, SUPABASE_URL } from "./env";

/** Client Supabase côté serveur (RSC, server actions, route handlers) : la session vient des cookies, la RLS fait le reste. */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(aPoser) {
        try {
          aPoser.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Appel depuis un Server Component : les cookies sont rafraîchis par le proxy, on ignore.
        }
      },
    },
  });
}

/** L'utilisateur courant ou null. */
export async function utilisateurCourant() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
