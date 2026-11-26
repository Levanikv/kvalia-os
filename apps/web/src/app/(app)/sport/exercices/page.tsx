import { SOURCE_EXERCICES, illustrationPour } from "@kvalia/core";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { nomAffiche } from "../lib";
import { Bibliotheque } from "./Bibliotheque";

/** Onglet Exos — la bibliothèque : les exercices en service (ADR 0019), par recherche, partie du corps et matériel. */
export default async function Page() {
  const { supabase } = await session();
  // Une requête rend au plus 1 000 lignes : la bibliothèque en compte davantage, on lit deux pages.
  const page = (debut: number) =>
    supabase
      .from("exercices_ref")
      .select("id, nom, nom_fr, partie_corps, equipement, difficulte, image_url, muscles, compose")
      .eq("source", SOURCE_EXERCICES)
      .order("nom")
      .order("id")
      .range(debut, debut + 999);
  const [a, b] = await Promise.all([page(0), page(1000)]);
  const data = [...(a.data ?? []), ...(b.data ?? [])];
  const exercices = data.map((e) => ({ ...e, affiche: nomAffiche(e), illustration: illustrationPour(e.nom) }));
  return (
    <ModuleFrame module="sport" surTitre={`${exercices.length.toLocaleString("fr-FR")} mouvements animés`} titre="Exercices">
      <Bibliotheque exercices={exercices} />
    </ModuleFrame>
  );
}
