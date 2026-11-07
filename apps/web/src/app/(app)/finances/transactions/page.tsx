import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Transactions"
      barre={<Segmented items={[{ href: "/finances", label: "À catégoriser" }, { href: "/finances/transactions", label: "Transactions" }, { href: "/finances/budgets", label: "Budgets" }, { href: "/finances/comptes", label: "Comptes" }]} />}>
      <Placeholder phase="3" ecran="Transactions" points={["Recherche en phrase, filtres", "Lien vers le justificatif (Documents)", "Import CSV BoursoBank puis Enable Banking"]} />
    </ModuleFrame>
  );
}
