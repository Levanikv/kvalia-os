import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Recettes">
      <Placeholder phase="2" ecran="Recettes" points={["Les 20 recettes de base avec macros", "Versions temporaires quand un produit manque", "Substituts"]} />
    </ModuleFrame>
  );
}
