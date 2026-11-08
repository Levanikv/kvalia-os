import { Fab } from "@/components/Fab";
import { ModuleBar } from "@/components/ModuleBar";

/** Shell commun : barre inférieure de l'application courante + bouton « + ». Le proxy garantit qu'un utilisateur est connecté ici. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Fab />
      <ModuleBar />
    </>
  );
}
