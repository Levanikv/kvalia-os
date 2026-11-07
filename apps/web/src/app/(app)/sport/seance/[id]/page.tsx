import Link from "next/link";
import { notFound } from "next/navigation";
import { parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { session } from "@/lib/session";
import { chargerSeance, dateLongue, kcalPrevues, libelleFocus, libelleType, nomAffiche } from "../../lib";
import { Checklist } from "./Checklist";

type Props = { params: Promise<{ id: string }> };

/** Séance : la liste des exercices à cocher, les kcal qui montent, et « Terminer » en bas. */
export default async function Page({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await session();
  const seance = await chargerSeance(supabase, id);
  if (!seance) notFound();
  const p = await parametresSport(supabase, user.id);
  const { poids, source } = await poidsActuel(supabase, user.id, p);

  const exos = seance.exercices_seance.map((e) => ({
    id: e.id, exercice_id: e.exercice_id, nom: nomAffiche(e.exercices_ref), partie: e.exercices_ref.partie_corps, image: e.exercices_ref.image_url,
    series: e.series, reps: e.reps, repos_s: e.repos_s, kcal: Number(e.kcal ?? 0), fait: e.fait, equipement: e.exercices_ref.equipement,
  }));

  return (
    <ModuleFrame module="sport" titre={seance.titre ?? libelleType(seance.type)} sousTitre={`${dateLongue(seance.jour)}${seance.focus ? ` · ${libelleFocus(seance.focus)}` : ""}`}
      action={<Link href={`/sport?jour=${seance.jour}`} className="tap flex w-11 items-center justify-center rounded-full bg-surface-2" aria-label="Retour"><Icon name="close" size={22} /></Link>}>
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />
      <Checklist
        seance={{ id: seance.id, jour: seance.jour, type: seance.type, etat: seance.etat, duree_min: seance.duree_min, kcal: Number(seance.kcal ?? 0), notes: seance.notes, ressenti: seance.ressenti, debut_le: seance.debut_le, faite_le: seance.faite_le }}
        exercices={exos}
        kcalPrevues={kcalPrevues(seance, poids)}
        poids={{ valeur: poids, source }}
      />
    </ModuleFrame>
  );
}
