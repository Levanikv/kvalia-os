import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { Segmented } from "@/components/Segmented";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Recettes"
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <Placeholder phase="2" ecran="Recettes" points={["Les 20 recettes de base avec macros", "Versions temporaires quand un produit manque", "Substituts"]} />
    </ModuleFrame>
  );
}
