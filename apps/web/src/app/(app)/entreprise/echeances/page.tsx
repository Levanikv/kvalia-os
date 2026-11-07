import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Échéances"
      barre={<Segmented items={[{ href: "/entreprise", label: "Pilotage" }, { href: "/entreprise/factures", label: "Factures" }, { href: "/entreprise/charges", label: "Charges" }, { href: "/entreprise/echeances", label: "Échéances" }]} />}>
      <Placeholder phase="3" ecran="Échéances" points={["TVA, URSSAF, acomptes IR, CFE", "Montants estimés, rappel 15 jours avant", "Marquer payée"]} />
    </ModuleFrame>
  );
}
