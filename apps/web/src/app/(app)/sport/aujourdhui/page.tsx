import { redirect } from "next/navigation";
import { chargerModeles, dureeModele, parametresSport } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { ChoixSeance } from "./ChoixSeance";

export const metadata = { title: "S’entraîner aujourd’hui · Sport" };

/**
 * « S'entraîner aujourd'hui » (plein écran, ADR 0021) : on choisit un type de séance et une durée, l'app compose la
 * séance (outil seance_a_la_carte) — ou on lance une de ses séances (planifier_seance_perso, une fois). On arrive
 * ensuite sur la séance, où on peut demander une autre proposition, changer un exercice, la garder, démarrer.
 * Une séance en cours reprend la main ; une séance du programme prévue aujourd'hui est rappelée, pas remplacée.
 */
export default async function Page() {
  const { supabase, user } = await session();
  const auj = aujourdhui();
  const [params, modeles, { data: duJour }] = await Promise.all([
    parametresSport(supabase, user.id),
    chargerModeles(supabase, user.id),
    supabase.from("seances").select("id, titre, type, etat, programme_id").eq("jour", auj).neq("type", "boxe").order("created_at"),
  ]);
  const seances = duJour ?? [];
  const enCours = seances.find((s) => s.etat === "en_cours");
  if (enCours) redirect(`/sport/seance/${enCours.id}`);
  const prevue = seances.find((s) => s.etat === "prevue");

  return (
    <ChoixSeance
      aujourdhui={auj}
      mode={params.mode}
      dureeDefaut={params.duree_min}
      modeles={Object.values(modeles).map((m) => ({
        id: m.id,
        nom: m.nom,
        nb: m.exercices.length,
        duree: dureeModele(m.exercices, params.effort_s_par_serie),
      }))}
      auProgramme={prevue?.programme_id ? { id: prevue.id, titre: prevue.titre ?? "Séance" } : null}
      proposition={prevue && !prevue.programme_id ? { id: prevue.id, titre: prevue.titre ?? "Séance" } : null}
    />
  );
}
