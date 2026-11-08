import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Plan semaine">
      <Placeholder
        phase="2"
        ecran="Plan de la semaine"
        points={["7 jours × 3 repas, midi ≠ soir", "Batch cooking du jeudi", "Génération de la liste de courses"]}
      />
    </ModuleFrame>
  );
}
