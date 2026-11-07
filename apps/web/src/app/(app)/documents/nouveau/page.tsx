import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="documents" titre="Ajouter">
      <Placeholder phase="3" ecran="Ajout d’un document" points={["Fichier / photo / partage iOS", "Typage automatique par l’agent", "Validation en un tap"]} />
    </ModuleFrame>
  );
}
