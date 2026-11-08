import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Budgets">
      <Placeholder phase="3" ecran="Budgets" points={["Par catégorie et par mois", "Reste à dépenser, alerte à 80 %", "Historique"]} />
    </ModuleFrame>
  );
}
