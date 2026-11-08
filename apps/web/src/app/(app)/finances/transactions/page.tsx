import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Transactions">
      <Placeholder
        phase="3"
        ecran="Transactions"
        points={["Recherche en phrase, filtres", "Lien vers le justificatif (Documents)", "Import CSV BoursoBank puis Enable Banking"]}
      />
    </ModuleFrame>
  );
}
