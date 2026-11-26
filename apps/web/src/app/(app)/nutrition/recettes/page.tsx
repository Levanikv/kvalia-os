import { listerRecettes, Repas } from "@kvalia/core";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { ListeRecettes } from "./ListeRecettes";

type Props = { searchParams: Promise<{ repas?: string }> };

/**
 * Onglet Recettes : toutes les recettes, ou seulement les siennes (créées, ou déjà notées au journal — `perso` et
 * `utilisations` de l'outil lister_recettes), par recherche, repas et usage. L'objectif du programme actif met en
 * tête ce qui lui correspond.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const { repas } = await searchParams;
  const [recettes, { data: prog }] = await Promise.all([
    listerRecettes(supabase, user.id),
    supabase.from("programmes").select("rythme").eq("actif", true).maybeSingle(),
  ]);
  const objectif = (prog?.rythme as { objectif?: string } | null)?.objectif ?? null;
  const initial = Repas.safeParse(repas);
  return (
    <ModuleFrame module="nutrition" surTitre={`${recettes.length} recettes · macros par portion`} titre="Recettes">
      <ListeRecettes recettes={recettes} objectif={objectif} repasInitial={initial.success ? initial.data : null} />
    </ModuleFrame>
  );
}
