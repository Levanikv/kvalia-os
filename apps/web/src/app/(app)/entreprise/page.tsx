import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="entreprise" titre="Entreprise">
      <Placeholder phase="3" ecran="Pilotage de la SASU" points={["CA facturé / encaissé, charges, bénéfice projeté", "Jauge : ce qu’il reste de passable en frais", "Impôt estimé sur le foyer (SASU à l’IR) — à valider avec le comptable", "Simulateur what-if en feuille"]} />
    </ModuleFrame>
  );
}
