import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="sport" titre="Historique"
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <Placeholder phase="2" ecran="Historique & progression" points={["Séances faites, ressenti", "Progression par exercice", "Charge / récupération (plus tard)"]} />
    </ModuleFrame>
  );
}
