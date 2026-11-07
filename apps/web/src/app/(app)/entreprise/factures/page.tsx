import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Factures"
      barre={<Segmented items={[{ href: "/entreprise", label: "Pilotage" }, { href: "/entreprise/factures", label: "Factures" }, { href: "/entreprise/charges", label: "Charges" }, { href: "/entreprise/echeances", label: "Échéances" }]} />}>
      <Placeholder phase="3" ecran="Factures & clients" points={["Émises, payées, en retard", "Ajout par upload (PDF) ou saisie", "Import Tiime"]} />
    </ModuleFrame>
  );
}
