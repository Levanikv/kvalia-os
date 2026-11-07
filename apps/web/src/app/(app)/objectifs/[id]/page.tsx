import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="objectifs" titre="Objectif">
      <Placeholder phase="1" ecran="Détail d’un objectif" points={["Valeur / cible, historique", "Ce qui alimente l’objectif", "Modifier par une phrase"]} />
    </ModuleFrame>
  );
}
