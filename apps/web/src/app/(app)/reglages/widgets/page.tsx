import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
export default function Page() {
  return <ModuleFrame module="reglages" titre="Widgets"><Placeholder phase="1" ecran="Widgets de la Home" points={["Ordre par glisser-déposer", "Activer / masquer chaque widget", "Widgets conditionnels (plus tard)"]} /></ModuleFrame>;
}
