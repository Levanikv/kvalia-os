import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="sport" titre="Séance">
      <Placeholder phase="2" ecran="Séance plein écran" points={["Un exercice à la fois, vidéo en boucle", "Séries × reps × charge, minuteur de repos", "Remplacer cet exercice, terminer + ressenti"]} />
    </ModuleFrame>
  );
}
