import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Échéances">
      <Placeholder phase="3" ecran="Échéances" points={["TVA, URSSAF, acomptes IR, CFE", "Montants estimés, rappel 15 jours avant", "Marquer payée"]} />
    </ModuleFrame>
  );
}
