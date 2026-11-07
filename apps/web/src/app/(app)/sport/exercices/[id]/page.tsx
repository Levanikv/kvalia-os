import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="sport" titre="Exercice">
      <Placeholder phase="2" ecran="Fiche exercice" points={["Vidéo / GIF (ExerciseDB)", "Muscles, matériel, consignes", "Historique de charge"]} />
    </ModuleFrame>
  );
}
