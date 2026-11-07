import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Budgets"
      barre={<Segmented items={[{ href: "/finances", label: "À catégoriser" }, { href: "/finances/transactions", label: "Transactions" }, { href: "/finances/budgets", label: "Budgets" }, { href: "/finances/comptes", label: "Comptes" }]} />}>
      <Placeholder phase="3" ecran="Budgets" points={["Par catégorie et par mois", "Reste à dépenser, alerte à 80 %", "Historique"]} />
    </ModuleFrame>
  );
}
