import { parametresSport, reponsesDepuisParametres } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { decaler } from "../../lib";
import { Parcours } from "./Parcours";

type Props = { searchParams: Promise<{ modifier?: string }> };

/**
 * Nouveau programme / Modifier le programme (plein écran, depuis l'onglet Programme) : objectif, échéance, rythme,
 * premier jour, proposition, génération. Le profil (niveau, lieu, matériel, douleurs, poids) est déjà connu :
 * il n'est pas redemandé ici — il se règle dans l'onboarding / Réglages › Sport.
 */
export default async function Page({ searchParams }: Props) {
  const { modifier } = await searchParams;
  const { supabase, user } = await session();
  const [params, { data: prog }] = await Promise.all([
    parametresSport(supabase, user.id),
    supabase.from("programmes").select("id").eq("actif", true).maybeSingle(),
  ]);
  const auj = aujourdhui();
  const jourSemaine = new Date(auj + "T12:00:00Z").getUTCDay();
  const lundiProchain = decaler(auj, jourSemaine === 1 ? 0 : (8 - jourSemaine) % 7);
  const mode = modifier && prog ? "modifier" : "nouveau";
  // Modifier : tout pré-rempli depuis le programme actuel. Nouveau : mêmes jours / durée, échéance remise à 12 semaines.
  const actuelles = reponsesDepuisParametres(params);
  const initiales = mode === "modifier" ? actuelles : { ...actuelles, semaines: 12 };
  return <Parcours mode={mode} initiales={initiales} base={params} aujourdhui={auj} lundiProchain={lundiProchain} remplace={!!prog} />;
}
