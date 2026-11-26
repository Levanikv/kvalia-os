import { parametresSport } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Bienvenue · Sport" };

/**
 * Onboarding muscu (première ouverture de Sport) : une question par écran, valeurs sur roues, reprise là où on s'est arrêté.
 * `?reprendre=1` : reprise à l'étape enregistrée ; `?revoir=1` : refaire le parcours pré-rempli (régénérer le programme).
 * Plein écran, sombre (maquettes Figma « Onboarding Muscu »). La première question est la façon de s'entraîner (programme, à la carte, mes séances — ADR 0021) : les questions
 * suivantes et l'arrivée s'y adaptent. Les réponses passent par `regler_sport`, puis `generer_programme` si on a choisi un programme.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ reprendre?: string; revoir?: string }> }) {
  const { supabase, user } = await session();
  const [params, sp] = await Promise.all([parametresSport(supabase, user.id), searchParams]);
  return (
    <Onboarding
      profil={params.profil ?? {}}
      mode={params.mode}
      etape={sp.revoir ? 17 : sp.reprendre ? (params.onboarding?.etape ?? 0) : 0}
      aujourdhui={aujourdhui()}
    />
  );
}
