import { ModuleFrame } from "@/components/ModuleFrame";
import { Segmented } from "@/components/Segmented";

export default function QuotidienLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleFrame
      module="quotidien"
      barre={
        <Segmented
          items={[
            { href: "/quotidien/courses", label: "Courses" },
            { href: "/quotidien/taches", label: "Tâches" },
            { href: "/quotidien/habitudes", label: "Habitudes" },
          ]}
        />
      }
    >
      {children}
    </ModuleFrame>
  );
}
