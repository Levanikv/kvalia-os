import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Charges"
      barre={<Segmented items={[{ href: "/entreprise", label: "Pilotage" }, { href: "/entreprise/factures", label: "Factures" }, { href: "/entreprise/charges", label: "Charges" }, { href: "/entreprise/echeances", label: "Échéances" }]} />}>
      <Placeholder phase="3" ecran="Charges pro" points={["Dépenses déductibles par catégorie", "Justificatif lié dans Documents", "Impact sur la jauge de frais"]} />
    </ModuleFrame>
  );
}
