import { redirect } from "next/navigation";
import { chargerModeles, dureeModele, LIBELLES, parametresSport } from "@kvalia/core";
import { aujourdhui, session } from "@/lib/session";
import { decaler } from "../../lib";
import { EditeurProgramme } from "./EditeurProgramme";

/**
 * Modifier le programme actif (sans en recréer un) : semaine type jour par jour (repos, séance générée ou une de
 * mes séances), durée, nombre de semaines, à partir de quand. Outil du noyau : modifier_programme.
 */
export default async function Page() {
  const { supabase, user } = await session();
  const { data: prog } = await supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle();
  if (!prog) redirect("/sport/programme/nouveau");
  const [params, modeles] = await Promise.all([parametresSport(supabase, user.id), chargerModeles(supabase, user.id)]);
  const auj = aujourdhui();
  const js = new Date(auj + "T12:00:00Z").getUTCDay();
  const r = (prog.rythme ?? {}) as { objectif?: string };
  return (
    <EditeurProgramme
      programme={{ debut: prog.debut, fin: prog.fin, objectif: r.objectif ? (LIBELLES.objectif[r.objectif] ?? prog.nom) : prog.nom }}
      initial={{
        jours_salle: [...new Set(params.jours_salle)].slice(0, Math.max(params.rythme.salle, 1)),
        seances_perso: params.seances_perso.filter((x) => modeles[x.modele_id]),
        duree_min: params.duree_min,
        semaines: params.semaines,
      }}
      modeles={Object.values(modeles).map((m) => ({ id: m.id, nom: m.nom, nb: m.exercices.length, duree: dureeModele(m.exercices) }))}
      dates={{ aujourdhui: auj, demain: decaler(auj, 1), lundi: decaler(auj, js === 1 ? 7 : (8 - js) % 7) }}
    />
  );
}
