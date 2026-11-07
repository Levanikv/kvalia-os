import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Client + utilisateur pour les server actions et les pages : redirige vers /connexion si la session a sauté. */
export async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

export function aujourdhui(): string {
  // Date locale (Europe/Paris côté serveur Railway = UTC ; on reste en ISO calendaire du navigateur en phase 1).
  return new Date().toISOString().slice(0, 10);
}
