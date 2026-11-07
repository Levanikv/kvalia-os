import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="nutrition" titre="Recette">
      <Placeholder phase="2" ecran="Fiche recette" points={["Ingrédients liés aux produits", "Macros par portion", "Ajouter au plan / à la liste"]} />
    </ModuleFrame>
  );
}
