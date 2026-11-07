import { redirect } from "next/navigation";
import { aujourdhuiIso } from "@kvalia/core";
import { createClient } from "@/lib/supabase/server";

/** Client + utilisateur pour les server actions et les pages : redirige vers /connexion si la session a sauté. */
export async function session() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/connexion");
  return { supabase, user };
}

/** Date du jour côté utilisateur (Europe/Paris) — le serveur Railway tourne en UTC. */
export function aujourdhui(): string {
  return aujourdhuiIso();
}
