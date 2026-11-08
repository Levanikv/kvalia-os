import Link from "next/link";
import { notFound } from "next/navigation";
import { dernieresCharges, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { session } from "@/lib/session";
import { chargerSeance, dateLongue, kcalPrevues, libelleFocus, libelleType, nomAffiche, positionProgramme } from "../../lib";
import { Checklist } from "./Checklist";

type Props = { params: Promise<{ id: string }> };

/** Séance : la liste des exercices à cocher, les charges à noter, les kcal qui montent, et « Terminer » en bas. */
export default async function Page({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await session();
  const seance = await chargerSeance(supabase, id);
  if (!seance) notFound();
  const p = await parametresSport(supabase, user.id);
  const [{ poids, source }, dernieres, { data: prog }] = await Promise.all([
    poidsActuel(supabase, user.id, p),
    dernieresCharges(
      supabase,
      user.id,
      seance.exercices_seance.map((e) => e.exercice_id),
      seance.id,
    ),
    seance.programme_id
      ? supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("id", seance.programme_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const pos = positionProgramme(prog, seance.jour);

  const exos = seance.exercices_seance.map((e) => ({
    id: e.id,
    exercice_id: e.exercice_id,
    nom: nomAffiche(e.exercices_ref),
    partie: e.exercices_ref.partie_corps,
    image: e.exercices_ref.image_url,
    series: e.series,
    reps: e.reps,
    repos_s: e.repos_s,
    kcal: Number(e.kcal ?? 0),
    fait: e.fait,
    equipement: e.exercices_ref.equipement,
    charge_kg: e.charge_kg === null ? null : Number(e.charge_kg),
    reps_faites: (e.realise as { reps_faites?: number } | null)?.reps_faites ?? null,
    derniere: dernieres[e.exercice_id] ?? null,
    substitut: e.substitut_de !== null,
  }));

  const sousTitre = [
    dateLongue(seance.jour),
    pos && !pos.avant && !pos.apres ? `Semaine ${pos.semaine}${pos.total ? ` / ${pos.total}` : ""}` : null,
    libelleFocus(seance.focus),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <ModuleFrame
      module="sport"
      titre={seance.titre ?? libelleType(seance.type)}
      sousTitre={sousTitre}
      gauche={
        <Link href={`/sport?jour=${seance.jour}`} className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour">
          <Icon name="arrow_back" size={24} />
        </Link>
      }
    >
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />
      <Checklist
        seance={{
          id: seance.id,
          jour: seance.jour,
          type: seance.type,
          etat: seance.etat,
          duree_min: seance.duree_min,
          kcal: Number(seance.kcal ?? 0),
          notes: seance.notes,
          ressenti: seance.ressenti,
          debut_le: seance.debut_le,
          faite_le: seance.faite_le,
        }}
        exercices={exos}
        kcalPrevues={kcalPrevues(seance, poids)}
        poids={{ valeur: poids, source }}
      />
    </ModuleFrame>
  );
}
