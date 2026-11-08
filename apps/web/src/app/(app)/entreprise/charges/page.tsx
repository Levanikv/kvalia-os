import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Charges">
      <Placeholder phase="3" ecran="Charges pro" points={["Dépenses déductibles par catégorie", "Justificatif lié dans Documents", "Impact sur la jauge de frais"]} />
    </ModuleFrame>
  );
}
