import Link from "next/link";
import { notFound } from "next/navigation";
import { historiqueCharge } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { libelleMateriel, libellePartie, nomAffiche } from "../../lib";
import { Video } from "./Video";
import { BoutonFait } from "./BoutonFait";
import { CourbeCharge } from "./CourbeCharge";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ seance?: string }> };
const DIFF: Record<string, string> = { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" };

/** Fiche exercice : vidéo en boucle façon Freeletics, puis consignes, repères, erreurs, respiration. */
export default async function Page({ params, searchParams }: Props) {
  const { id } = await params;
  const { seance: seanceId } = await searchParams;
  const { supabase, user } = await session();
  const { data: e } = await supabase.from("exercices_ref").select("*").eq("id", id).maybeSingle();
  if (!e) notFound();
  const historique = await historiqueCharge(supabase, user.id, id, 12);

  // Contexte séance (prescription + exercice suivant) si on vient d'une séance
  let ctx: {
    ligne: { id: string; series: number; reps: string; repos_s: number; kcal: number | null; fait: boolean };
    suivant: string | null;
    seanceFaite: boolean;
  } | null = null;
  if (seanceId) {
    const { data: lignes } = await supabase
      .from("exercices_seance")
      .select("id, exercice_id, ordre, series, reps, repos_s, kcal, fait, seances!inner(etat)")
      .eq("seance_id", seanceId)
      .order("ordre");
    const idx = (lignes ?? []).findIndex((l) => l.exercice_id === id);
    if (idx >= 0) {
      const l = lignes![idx];
      ctx = {
        ligne: { id: l.id, series: l.series, reps: l.reps, repos_s: l.repos_s, kcal: l.kcal === null ? null : Number(l.kcal), fait: l.fait },
        suivant: lignes![idx + 1]?.exercice_id ?? null,
        seanceFaite: (l.seances as unknown as { etat: string }).etat === "faite",
      };
    }
  }

  const retour = seanceId ? `/sport/seance/${seanceId}` : "/sport/exercices";
  return (
    <ModuleFrame
      module="sport"
      titre={nomAffiche(e)}
      sousTitre={e.nom !== nomAffiche(e) ? e.nom : undefined}
      gauche={
        <Link href={retour} className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour">
          <Icon name="arrow_back" size={24} />
        </Link>
      }
    >
      <Video src={e.video_url} srcF={e.video_url_f} poster={e.image_url} posterF={e.image_url_f} />

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
        {e.partie_corps && <span className="rounded-full bg-action-primary/20 px-2.5 py-1 font-medium text-fg-brand">{libellePartie(e.partie_corps)}</span>}
        {e.equipement && <span className="rounded-full bg-surface-default px-2.5 py-1 text-fg-secondary">{libelleMateriel(e.equipement)}</span>}
        {e.difficulte && <span className="rounded-full bg-surface-default px-2.5 py-1 text-fg-secondary">{DIFF[e.difficulte] ?? e.difficulte}</span>}
        {e.compose && <span className="rounded-full bg-surface-default px-2.5 py-1 text-fg-secondary">Polyarticulaire</span>}
        {e.unilateral && <span className="rounded-full bg-surface-default px-2.5 py-1 text-fg-secondary">Unilatéral</span>}
      </div>

      {ctx && (
        <div className="mt-4 rounded-lg border border-line-default bg-surface-default p-4">
          <p className="text-[11px] uppercase tracking-wide text-fg-tertiary">Dans ta séance</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {ctx.ligne.series} × {ctx.ligne.reps}
          </p>
          <p className="text-sm text-fg-secondary">
            {ctx.ligne.repos_s ? `Repos ${ctx.ligne.repos_s} s · ` : ""}
            {ctx.ligne.kcal ?? 0} kcal
          </p>
          <BoutonFait
            ligneId={ctx.ligne.id}
            fait={ctx.ligne.fait}
            desactive={ctx.seanceFaite}
            suivant={ctx.suivant ? `/sport/exercices/${ctx.suivant}?seance=${seanceId}` : retour}
          />
        </div>
      )}

      {historique.length > 0 && (
        <section className="mt-5 rounded-lg border border-line-default bg-surface-default p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Charge</h2>
            <p className="text-sm">
              <span className="text-2xl font-semibold tracking-tight">{historique[0].charge_kg}</span>{" "}
              <span className="text-fg-secondary">
                kg · {new Date(historique[0].jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
              </span>
            </p>
          </div>
          <CourbeCharge points={[...historique].reverse().map((h) => ({ jour: h.jour, kg: h.charge_kg }))} />
          <ul className="mt-2 space-y-1 text-xs text-fg-secondary">
            {historique.slice(0, 5).map((h) => (
              <li key={h.id} className="flex justify-between">
                <Link href={`/sport/seance/${h.seance_id}`} className="truncate">
                  {new Date(h.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {h.titre ?? ""}
                </Link>
                <span className="shrink-0 tabular-nums">
                  {h.series} × {h.reps_faites ?? h.reps} · <strong className="text-fg-primary">{h.charge_kg} kg</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.description && <p className="mt-5 text-sm leading-relaxed text-fg-secondary">{e.description}</p>}

      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Muscles</h2>
        <p className="mt-1 text-sm">
          <span className="font-medium">{e.muscles.join(", ")}</span>
          {e.muscles_secondaires.length > 0 && <span className="text-fg-secondary"> · {e.muscles_secondaires.join(", ")}</span>}
        </p>
      </section>

      {e.consignes.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Exécution</h2>
          <ol className="mt-2 space-y-2">
            {e.consignes.map((c, i) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action-primary/20 text-xs font-semibold text-fg-brand">
                  {i + 1}
                </span>
                <span>{c}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {e.reperes.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Repères</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {e.reperes.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Icon name="check" size={18} className="shrink-0 text-feedback-success-text" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.erreurs.length > 0 && (
        <section className="mt-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-fg-tertiary">Erreurs fréquentes</h2>
          <ul className="mt-2 space-y-1.5 text-sm">
            {e.erreurs.map((r, i) => (
              <li key={i} className="flex gap-2">
                <Icon name="close" size={18} className="shrink-0 text-feedback-danger-text" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {e.respiration && (
        <section className="mt-5 rounded-lg bg-surface-default p-4">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-tertiary">
            <Icon name="air" size={18} /> Respiration
          </h2>
          <p className="mt-1 text-sm">{e.respiration}</p>
        </section>
      )}
      <p className="mt-6 text-[11px] text-fg-tertiary">Source : free-exercise-db-with-videos (MIT). Les textes sont en anglais pour l’instant.</p>
    </ModuleFrame>
  );
}
