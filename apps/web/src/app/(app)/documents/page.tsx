import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="documents" titre="Porte-documents">
      <Placeholder phase="3" ecran="Coffre" points={["Grille par type, badge expiration", "Recherche en phrase (pgvector)", "Upload, photo, partage iOS"]} />
    </ModuleFrame>
  );
}
