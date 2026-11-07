import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Comptes"
      barre={<Segmented items={[{ href: "/finances", label: "À catégoriser" }, { href: "/finances/transactions", label: "Transactions" }, { href: "/finances/budgets", label: "Budgets" }, { href: "/finances/comptes", label: "Comptes" }]} />}>
      <Placeholder phase="3" ecran="Comptes" points={["Soldes, dernière synchro", "Consentement DSP2 (90 jours)", "Périmètre perso uniquement — la SASU est dans Entreprise"]} />
    </ModuleFrame>
  );
}
