import { notFound } from "next/navigation";
import { dernieresCharges, illustrationPour, parametresSport, poidsActuel, type Realise } from "@kvalia/core";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { demo, chargerSeance, kcalPrevues, libelleFocus, libellePartie, libelleType, nomAffiche, positionProgramme } from "../../lib";
import { SeanceLive, type ExoVue, type SeanceVue } from "./SeanceLive";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string; d?: string }> };

/**
 * Séance (workflow « Home workflow » du Figma) : avant départ (chrono 0:00, « Démarrer »), en cours (chrono, exercice
 * en cours, séries et repos dans la fiche, pause), terminer (exercices ratés → ressenti → fin de séance), résumé
 * quand elle est faite, aperçu en lecture seule pour un autre jour.
 */
export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase, user } = await session();
  const [seance, p] = await Promise.all([chargerSeance(supabase, id), parametresSport(supabase, user.id)]);
  if (!seance) notFound();
  const [{ poids }, dernieres, { data: prog }, { count: avant }] = await Promise.all([
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
    seance.programme_id
      ? supabase
          .from("seances")
          .select("id", { count: "exact", head: true })
          .eq("programme_id", seance.programme_id)
          .neq("type", "boxe")
          .lt("jour", seance.jour)
      : Promise.resolve({ count: null }),
  ]);
  const pos = positionProgramme(prog, seance.jour);

  const exos: ExoVue[] = seance.exercices_seance.map((e) => {
    const r = (e.realise as Realise | null) ?? {};
    return {
      id: e.id,
      exercice_id: e.exercice_id,
      nom: nomAffiche(e.exercices_ref),
      partie: libellePartie(e.exercices_ref.partie_corps),
      image: e.exercices_ref.image_url,
      illustration: illustrationPour(e.exercices_ref.nom),
      video: demo(e.exercices_ref),
      series: e.series,
      reps: e.reps,
      repos_s: e.repos_s,
      kcal: Number(e.kcal ?? 0),
      fait: e.fait,
      equipement: e.exercices_ref.equipement,
      charge_kg: e.charge_kg === null ? null : Number(e.charge_kg),
      derniere: dernieres[e.exercice_id] ?? null,
      substitut: e.substitut_de !== null,
      seriesFaites: (r.series ?? []).map((x) => ({ reps: x.reps, charge_kg: x.charge_kg, le: x.le })),
      rate: !!r.rate,
    };
  });

  const parties = [...new Set(exos.map((e) => e.partie).filter(Boolean))].slice(0, 3);
  const surTitre = [
    libelleFocus(seance.focus) ? `Bloc ${libelleFocus(seance.focus)?.toLowerCase()}` : null,
    pos && !pos.avant && !pos.apres ? `S${pos.semaine}${pos.total ? `/${pos.total}` : ""}` : null,
    seance.type !== "boxe" && avant !== null ? `Séance ${(avant ?? 0) + 1}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const vue: SeanceVue = {
    id: seance.id,
    jour: seance.jour,
    titre: seance.titre ?? libelleType(seance.type),
    sousTitre: parties
      .join(" · ")
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase()),
    surTitre,
    etat: seance.etat,
    kcal: Number(seance.kcal ?? 0),
    kcalPrevues: kcalPrevues(seance, poids),
    duree_min: seance.duree_min,
    ressenti: seance.ressenti,
    debut_le: seance.debut_le,
    pause_le: seance.pause_le,
    pause_cumul_s: seance.pause_cumul_s ?? 0,
    faite_le: seance.faite_le,
    estAujourdhui: seance.jour === aujourdhui(),
    estPassee: seance.jour < aujourdhui(),
    type: seance.type,
    // Hors programme : séance à la carte ou séance perso lancée une fois (ADR 0021).
    libre: !seance.programme_id,
    modeleId: seance.modele_id,
    variante: Math.max(0, Math.min(98, Number.parseInt(sp.v ?? "0", 10) || 0)),
    dureeVisee: Number.parseInt(sp.d ?? "", 10) || null,
  };

  return (
    <>
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />
      <SeanceLive seance={vue} exercices={exos} />
    </>
  );
}
