import { redirect } from "next/navigation";
import { bilanJour, executer, parametresSport, poidsActuel } from "@kvalia/core";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { HomeSport } from "./HomeSport";
import { jourDepuis, marquesAutour, seancesPourJour } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Sport — vue Jour = maquette Figma « 21 · Home Sport · v3 (app) » (dérivée de « Home mix »), au pixel.
 * En-tête (menu, bloc, date, niveau) → jours → séance du jour (carte sombre) → objectif de la semaine →
 * énergie (double jauge) → corps (protéines, poids, volume) → records → coach.
 * Les chiffres viennent de `tableau_sport` (core), du bilan nutrition et des séances : rien n'est inventé ici.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);

  const [seances, params, { data: programme }, marques, bilan, tableau] = await Promise.all([
    seancesPourJour(supabase, jour),
    parametresSport(supabase, user.id),
    supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle(),
    marquesAutour(supabase, jour),
    bilanJour(supabase, user.id, jour),
    executer("tableau_sport", { jour }, { db: supabase, userId: user.id }),
  ]);
  // Première ouverture de Sport : ni programme, ni onboarding terminé ou passé → onboarding muscu.
  const ob = params.onboarding;
  if (!programme && !ob?.termine && !ob?.passe) redirect("/sport/bienvenue");
  const { poids } = await poidsActuel(supabase, user.id, params);
  const prochaine =
    seances.length === 0 || seances.every((s) => s.type === "repos")
      ? (
          await supabase
            .from("seances")
            .select("id, jour, titre, type")
            .gt("jour", jour)
            .eq("etat", "prevue")
            .neq("type", "repos")
            .order("jour")
            .limit(1)
            .maybeSingle()
        ).data
      : null;

  return (
    <>
      <RealtimeRefresh tables={["seances", "exercices_seance", "journal_repas", "pesees"]} />
      <HomeSport
        jour={jour}
        auj={auj}
        seances={seances}
        params={params}
        programme={programme}
        marques={marques}
        bilan={bilan}
        tableau={tableau}
        poids={poids}
        prochaine={prochaine}
      />
    </>
  );
}
