import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="home" titre="Bienvenue">
      <Placeholder phase="1" ecran="Onboarding" points={["Passkey", "Modules à activer", "Import du seed (produits, recettes, habitudes)"]} />
    </ModuleFrame>
  );
}
