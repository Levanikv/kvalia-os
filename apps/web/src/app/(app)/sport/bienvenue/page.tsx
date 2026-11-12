import { parametresSport } from "@kvalia/core";
import { session } from "@/lib/session";
import { Onboarding } from "./Onboarding";

export const metadata = { title: "Bienvenue · Sport" };

/**
 * Onboarding muscu (première ouverture de Sport) : une question par écran, valeurs sur roues, reprise là où on s'est arrêté.
 * `?reprendre=1` : reprise à l'étape enregistrée ; `?revoir=1` : refaire le parcours pré-rempli (régénérer le programme).
 * Plein écran, sombre (maquettes Figma « Onboarding Muscu »). Les réponses passent par `regler_sport` puis `generer_programme`.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ reprendre?: string; revoir?: string }> }) {
  const { supabase, user } = await session();
  const [params, sp] = await Promise.all([parametresSport(supabase, user.id), searchParams]);
  return <Onboarding profil={params.profil ?? {}} etape={sp.revoir ? 1 : sp.reprendre ? (params.onboarding?.etape ?? 0) : 0} />;
}
