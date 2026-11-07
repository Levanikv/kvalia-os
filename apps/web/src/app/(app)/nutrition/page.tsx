import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Nutrition"
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <Placeholder phase="2" ecran="Journal du jour" points={["Anneau calories + 3 barres macros", "Repas pré-remplis : un tap = pris", "Ajout libre par phrase ; pesée du matin"]} />
    </ModuleFrame>
  );
}
