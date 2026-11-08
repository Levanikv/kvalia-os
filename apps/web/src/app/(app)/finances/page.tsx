import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Finances">
      <Placeholder phase="3" ecran="À catégoriser" points={["Pile de transactions en swipe", "Règles apprises, puis l’agent", "Résumé du mois"]} />
    </ModuleFrame>
  );
}
