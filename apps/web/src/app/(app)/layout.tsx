import { Fab } from "@/components/Fab";
import { TabBar } from "@/components/TabBar";

/** Shell commun à toutes les mini-apps : tab bar + bouton « + ». Le proxy garantit qu'un utilisateur est connecté ici. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Fab />
      <TabBar />
    </>
  );
}
