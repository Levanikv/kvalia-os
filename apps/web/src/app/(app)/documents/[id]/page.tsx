import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="documents" titre="Document">
      <Placeholder phase="3" ecran="Aperçu" points={["Champs : type, numéro, expiration, entité", "Envoyer par mail (confirmation)", "Lien de partage 24 h"]} />
    </ModuleFrame>
  );
}
