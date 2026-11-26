import { repasDuMoment } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { FournisseurAjout } from "./Ajout";
import { alimentsRecents } from "./donnees";

/**
 * Tout Nutrition partage la feuille d'ajout (`FournisseurAjout`) : le « + » de la barre, les tuiles de repas et la
 * page « Ajouter à un repas » ouvrent la même, avec les mêmes aliments récents.
 */
export default async function NutritionLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await session();
  const recents = await alimentsRecents(supabase);
  return (
    <FournisseurAjout aujourdhui={aujourdhui()} repasDuMoment={repasDuMoment()} recents={recents}>
      {children}
    </FournisseurAjout>
  );
}
