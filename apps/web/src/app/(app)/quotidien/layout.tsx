import { ModuleFrame } from "@/components/ModuleFrame";

/** Cadre du Quotidien ; la barre inférieure (Courses · Tâches · Habitudes) vient du layout (app). */
export default function QuotidienLayout({ children }: { children: React.ReactNode }) {
  return <ModuleFrame module="quotidien">{children}</ModuleFrame>;
}
