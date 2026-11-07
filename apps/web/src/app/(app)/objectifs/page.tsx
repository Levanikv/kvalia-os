import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="objectifs" titre="Objectifs">
      <Placeholder phase="1" ecran="Objectifs" points={["Sport, épargne, habitude, autre", "Avancement et échéance", "Liés à un programme, un budget, une habitude"]} />
    </ModuleFrame>
  );
}
