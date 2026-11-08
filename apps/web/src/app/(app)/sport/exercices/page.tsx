import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { nomAffiche } from "../lib";
import { Bibliotheque } from "./Bibliotheque";

/** Bibliothèque : 317 exercices filtrables par partie du corps, matériel et recherche. */
export default async function Page() {
  const { supabase } = await session();
  const { data } = await supabase
    .from("exercices_ref")
    .select("id, nom, nom_fr, partie_corps, equipement, difficulte, image_url, muscles, compose")
    .order("nom");
  const exercices = (data ?? []).map((e) => ({ ...e, affiche: nomAffiche(e) }));
  return (
    <ModuleFrame
      module="sport"
      titre="Exercices"
      sousTitre={`${exercices.length} mouvements en vidéo`}
      gauche={
        <Link href="/sport" className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour">
          <Icon name="arrow_back" size={24} />
        </Link>
      }
    >
      <Bibliotheque exercices={exercices} />
    </ModuleFrame>
  );
}
