import type { Metadata } from "next";
import { ModuleFrame } from "@/components/ModuleFrame";
import { Capture } from "./Capture";

export const metadata: Metadata = { title: "Capture" };

/** Feuille « + » : ajout rapide. Cible aussi du raccourci iOS (?texte=…) en phase 1. */
export default async function PageCapture({ searchParams }: { searchParams: Promise<{ texte?: string }> }) {
  const { texte } = await searchParams;
  return (
    <ModuleFrame module="capture" titre="Capture rapide">
      <Capture initial={texte ?? ""} />
    </ModuleFrame>
  );
}
