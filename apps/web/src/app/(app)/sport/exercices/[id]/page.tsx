import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { libelleMateriel, libellePartie, nomAffiche } from "../../lib";
import { Video } from "./Video";
import { BoutonFait } from "./BoutonFait";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ seance?: string }> };
const DIFF: Record<string, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

/** Fiche exercice : vidéo en boucle façon Freeletics, puis consignes, repères, erreurs, respiration. */
export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { seance: seanceId } = await searchParams;
  const { supabase } = await session();
  const { data: e } = await supabase.from("exercices_ref").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();

  // Contexte séance (prescription + exercice suivant) si on vient d'une séance
  let ctx: { ligne: { id: string; series: number; reps: string; repos_s: number; kcal: number | null; fait: boolean }; suivant: string | null; seanceFaite: boolean } | null = null;
  if (seanceId) {
    const { data: lignes } = await supabase.from("exercices_seance").select("id, exercice_id, ordre, series, reps, repos_s, kcal, fait, seances!inner(etat)")
      .eq("seance_id", seanceId).order("ordre");
    const idx = (lignes ?? []).findIndex((l) => l.exercice_id === id);
    if (idx >= 0) {
      const l = lignes![idx];
      ctx = { ligne: { id: l.id, series: l.series, reps: l.reps, repos_s: l.repos_s, kcal: l.kcal === null ? null : Number(l.kcal), fait: l.fait }, suivant: lignes![idx + 1]?.exercice_id ?? null, seanceFaite: (l.seances as unknown as { etat: string }).etat === "faite" };
    }
  }

  const retour = seanceId ? `/sport/seance/${seanceId}` : "/sport/exercices";
  return (
    <ModuleFrame module="sport" titre={nomAffiche(e)} sousTitre={e.nom !== nomAffiche(e) ? e.nom : undefined}
      action={<Link href={retour} className="tap flex w-11 items-center justify-center rounded-full bg-surface-2" aria-label="Retour"><Icon name="arrow_back" size={22} /></Link>}>
      <Video src={e.video_url} srcF={e.video_url_f} poster={e.image_url} posterF={e.image_url_f} />

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {e.partie_corps && <span className="rounded-full bg-accent/20 px-2.5 py-1 font-medium text-accent">{libellePartie(e.partie_corps)}</span>}
        {e.equipement && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-text-2">{libelleMateriel(e.equipement)}</span>}
        {e.difficulte && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-text-2">{DIFF[e.difficulte] ?? e.difficulte}</span>}
        {e.compose && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-text-2">Polyarticulaire</span>}
        {e.unilateral && <span className="rounded-full bg-surface-2 px-2.5 py-1 text-text-2">Unilatéral</span>}
      </div>

      {ctx && (
        <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-[11px] uppercase tracking-wide text-text-3">Dans ta séance</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{ctx.ligne.series} × {ctx.ligne.reps}</p>
          <p className="text-sm text-text-2">{ctx.ligne.repos_s ? `Repos ${ctx.ligne.repos_s} s · ` : ""}{ctx.ligne.kcal ?? 0} kcal</p>
          <BoutonFait ligneId={ctx.ligne.id} fait={ctx.ligne.fait} desactive={ctx.seanceFaite} suivant={ctx.suivant ? `/sport/exercices/${ctx.suivant}?seance=${seanceId}` : retour} />
        </div>
      )}

      {e.description && <p className="mt-5 text-sm leading-relaxed text-text-2">{e.description}</p>}

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-text-3">Muscles</h2>
        <p className="mt-1 text-sm"><span className="font-medium">{e.muscles.join(", ")}</span>{e.muscles_secondaires.length > 0 && <span className="text-text-2"> · {e.muscles_secondaires.join(", ")}</span>}</p>
      </section>

      {e.consignes.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-3">Exécution</h2>
          <ol className="mt-2 space-y-2">
            {e.consignes.map((c, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/20 text-xs font-semibold text-accent">{i + 1}</span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {e.reperes.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-3">Repères</h2>
          <ul className="mt-2 space-y-1.5 text-sm">{e.reperes.map((r, i) => <li key={i} className="flex gap-2"><Icon name="check" size={18} className="shrink-0 text-success" /><span>{r}</span></li>)}</ul>
        </section>
      )}

      {e.erreurs.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-text-3">Erreurs fréquentes</h2>
          <ul className="mt-2 space-y-1.5 text-sm">{e.erreurs.map((r, i) => <li key={i} className="flex gap-2"><Icon name="close" size={18} className="shrink-0 text-danger" /><span>{r}</span></li>)}</ul>
        </section>
      )}

      {e.respiration && (
        <section className="mt-5 rounded-lg bg-surface-2 p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-3"><Icon name="air" size={18} /> Respiration</h2>
          <p className="mt-1 text-sm">{e.respiration}</p>
        </section>
      )}
      <p className="mt-6 text-[11px] text-text-3">Source : free-exercise-db-with-videos (MIT). Les textes sont en anglais pour l’instant.</p>
    </ModuleFrame>
  );
}
