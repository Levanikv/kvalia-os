import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Simulateur">
      <Placeholder phase="3" ecran="Simulateur what-if" points={["Si je facture X de plus", "Si je passe Y en frais", "Si je me verse Z → net et impôt"]} />
    </ModuleFrame>
  );
}
