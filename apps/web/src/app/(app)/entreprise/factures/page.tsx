import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Factures">
      <Placeholder phase="3" ecran="Factures & clients" points={["Émises, payées, en retard", "Ajout par upload (PDF) ou saisie", "Import Tiime"]} />
    </ModuleFrame>
  );
}
