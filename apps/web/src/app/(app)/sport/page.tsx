import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="sport" titre="Sport"
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <Placeholder phase="2" ecran="Programme" points={["Programme 12 semaines généré par l’agent (blocs de 4)", "Séance du jour en un tap", "Rythme : 4 salle + 1–2 boxe, matériel"]} />
    </ModuleFrame>
  );
}
