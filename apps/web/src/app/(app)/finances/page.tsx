import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Finances"
      barre={<Segmented items={[{ href: "/finances", label: "À catégoriser" }, { href: "/finances/transactions", label: "Transactions" }, { href: "/finances/budgets", label: "Budgets" }, { href: "/finances/comptes", label: "Comptes" }]} />}>
      <Placeholder phase="3" ecran="À catégoriser" points={["Pile de transactions en swipe", "Règles apprises, puis l’agent", "Résumé du mois"]} />
    </ModuleFrame>
  );
}
