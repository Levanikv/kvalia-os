import { notFound } from "next/navigation";
import { chargerModeles, parametresSport } from "@kvalia/core";
import { session } from "@/lib/session";
import { EditeurSeance } from "../EditeurSeance";
import { donneesEditeur } from "../donnees";

type Props = { params: Promise<{ id: string }> };

/** Une séance perso : la modifier, la mettre au programme (chaque semaine ou une fois), la supprimer. */
export default async function Page({ params }: Props) {
  const { id } = await params;
  const { supabase, user } = await session();
  const [modeles, reglages, d] = await Promise.all([chargerModeles(supabase, user.id, [id]), parametresSport(supabase, user.id), donneesEditeur(supabase)]);
  const m = modeles[id];
  if (!m) notFound();
  return (
    <EditeurSeance
      refs={d.refs}
      dates={d.dates}
      programmeActif={d.programmeActif}
      modele={{ id: m.id, nom: m.nom, type: m.type, notes: m.notes, exercices: m.exercices }}
      joursPlanifies={reglages.seances_perso.filter((x) => x.modele_id === id).map((x) => x.jour)}
    />
  );
}
