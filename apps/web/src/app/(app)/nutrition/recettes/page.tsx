import Link from "next/link";
import { listerRecettes, Repas } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { ListeRecettes } from "./ListeRecettes";

type Props = { searchParams: Promise<{ repas?: string }> };

/**
 * Recettes : les recettes avec leurs macros par portion, filtrables par repas et par usage (avant / après la séance,
 * riche en protéines, léger…). L'objectif du programme actif met en avant ce qui lui correspond.
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
    <ModuleFrame
      module="nutrition"
      surTitre="Nutrition"
      titre="Recettes"
      gauche={
        <Link href="/nutrition" className="kv-iconbtn" aria-label="Retour au journal">
          <Icon name="chevron_left" size={24} />
        </Link>
      }
    >
      <ListeRecettes recettes={recettes} objectif={objectif} repasInitial={initial.success ? initial.data : null} />
    </ModuleFrame>
  );
}
