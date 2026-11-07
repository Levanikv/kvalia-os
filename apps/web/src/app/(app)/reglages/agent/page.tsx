import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
export default function Page() {
  return <ModuleFrame module="reglages" titre="Agent"><Placeholder phase="4" ecran="Contexte de l’agent" points={["Mémoire éditable (objectifs, règles, préférences)", "Outils avec confirmation", "Plafond de coût par jour"]} /></ModuleFrame>;
}
