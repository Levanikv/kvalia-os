import Link from "next/link";
import { parametresNutrition } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { FormulaireNutrition } from "./FormulaireNutrition";

export default async function Page() {
  const { supabase, user } = await session();
  const params = await parametresNutrition(supabase, user.id);
  return (
    <ModuleFrame module="reglages" titre="Nutrition" sousTitre="Cible du jour = base + kcal brûlées en séance"
      action={<Link href="/reglages" className="tap flex w-11 items-center justify-center rounded-full bg-surface-2" aria-label="Retour"><Icon name="arrow_back" size={22} /></Link>}>
      <FormulaireNutrition initial={params} />
    </ModuleFrame>
  );
}
