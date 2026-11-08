import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";

export default function Page() {
  return (
    <ModuleFrame module="finances" titre="Comptes">
      <Placeholder
        phase="3"
        ecran="Comptes"
        points={["Soldes, dernière synchro", "Consentement DSP2 (90 jours)", "Périmètre perso uniquement — la SASU est dans Entreprise"]}
      />
    </ModuleFrame>
  );
}
