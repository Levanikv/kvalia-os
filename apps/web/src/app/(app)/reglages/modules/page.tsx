import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
export default function Page() {
  return <ModuleFrame module="reglages" titre="Modules"><Placeholder phase="1" ecran="Modules & tab bar" points={["Modules activés", "Ordre de la tab bar", "Thème light / dark / système"]} /></ModuleFrame>;
}
