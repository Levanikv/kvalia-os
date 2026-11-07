import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Plan semaine"
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <Placeholder phase="2" ecran="Plan de la semaine" points={["7 jours × 3 repas, midi ≠ soir", "Batch cooking du jeudi", "Génération de la liste de courses"]} />
    </ModuleFrame>
  );
}
