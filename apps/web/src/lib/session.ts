import { redirect } from "next/navigation";
import { cache } from "react";
import { aujourdhuiIso } from "@kvalia/core";
import { createClient } from "@/lib/supabase/server";

/**
 * Session de la requête, lue une seule fois (React `cache`) : la page, `ModuleFrame` et les composants serveur
 * partagent le même client et le même utilisateur. `getClaims()` vérifie le jeton localement (clés de signature
 * asymétriques) au lieu d'un aller-retour au serveur Auth à chaque appel — c'est ce qui rendait chaque navigation lente.
 * Le proxy a déjà rafraîchi le jeton si besoin.
 */
const lireSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const c = data?.claims;
  if (!c?.sub) return null;
  return { supabase, user: { id: c.sub, email: typeof c.email === "string" ? c.email : null } };
});

/** Client + utilisateur pour les server actions et les pages : redirige vers /connexion si la session a sauté. */
export async function session() {
  const s = await lireSession();
  if (!s) redirect("/connexion");
  return s;
}

/** Prénom (ou email) pour l'avatar, lu une fois par requête. */
export const initialeUtilisateur = cache(async (): Promise<string> => {
  const s = await lireSession();
  if (!s) return "?";
  const { data: profil } = await s.supabase.from("profils").select("prenom").eq("id", s.user.id).maybeSingle();
  return (profil?.prenom || s.user.email || "?").trim().charAt(0).toUpperCase();
});

/** Date du jour côté utilisateur (Europe/Paris) — le serveur Railway tourne en UTC. */
export function aujourdhui(): string {
  return aujourdhuiIso();
}
