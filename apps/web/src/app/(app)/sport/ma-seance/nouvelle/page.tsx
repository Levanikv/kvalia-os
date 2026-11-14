import { session } from "@/lib/session";
import { EditeurSeance } from "../EditeurSeance";
import { donneesEditeur } from "../donnees";

/** Créer une séance perso (« Mes séances ») : nom, type, exercices, séries / reps / repos / charge. */
export default async function Page() {
  const { supabase } = await session();
  const d = await donneesEditeur(supabase);
  return <EditeurSeance refs={d.refs} dates={d.dates} programmeActif={d.programmeActif} />;
}
