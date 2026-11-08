import { parametresSport, poidsActuel } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { Assistant } from "./Assistant";

/**
 * Créer / régénérer le programme : un parcours plein écran en étapes (objectif → niveau → semaine → séance
 * → matériel → aperçu), pré-rempli avec les réglages actuels. La génération passe par `generer_programme`.
 */
export default async function Page() {
  const { supabase, user } = await session();
  const params = await parametresSport(supabase, user.id);
  const [{ poids, source }, { data: prog }, { data: materiels }] = await Promise.all([
    poidsActuel(supabase, user.id, params),
    supabase.from("programmes").select("id, nom, debut, fin").eq("actif", true).maybeSingle(),
    supabase.from("exercices_ref").select("equipement").not("equipement", "is", null),
  ]);
  const compte = new Map<string, number>();
  for (const m of materiels ?? []) if (m.equipement) compte.set(m.equipement, (compte.get(m.equipement) ?? 0) + 1);

  return (
    <div data-module="sport" className="min-h-dvh bg-surface text-text">
      <Assistant
        initial={params}
        auj={aujourdhui()}
        poids={{ valeur: poids, source }}
        programme={prog ? { nom: prog.nom, fin: prog.fin } : null}
        materiels={[...compte.entries()].sort((a, b) => b[1] - a[1])}
      />
    </div>
  );
}
