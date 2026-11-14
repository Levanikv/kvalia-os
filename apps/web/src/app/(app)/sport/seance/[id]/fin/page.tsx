import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { chronoSecondes, defiSemaine, volumeSeance, type Realise } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { session } from "@/lib/session";
import { chargerSeance, decaler, formatChrono, libelleFocus, nomAffiche, positionProgramme } from "../../../lib";

type Props = { params: Promise<{ id: string }> };

const TITRES: Record<number, string> = { 1: "C’est fait.", 2: "Accroché.", 3: "Bien joué.", 4: "Solide.", 5: "Énorme." };

/** A10 / C02 · Fin de séance : récap (kcal, volume, séries, exercices), défi de la semaine, exercices ratés reprogrammés. */
export default async function Page({ params }: Props) {
  const { id } = await params;
  const { supabase } = await session();
  const seance = await chargerSeance(supabase, id);
  if (!seance) notFound();
  if (seance.etat !== "faite") redirect(`/sport/seance/${id}`);

  const d = new Date(seance.jour + "T12:00:00Z");
  const lundi = decaler(seance.jour, -((d.getUTCDay() + 6) % 7));
  const [{ data: semaine }, { data: precedente }, { data: prog }] = await Promise.all([
    supabase.from("seances").select("type, etat").gte("jour", lundi).lte("jour", decaler(lundi, 6)),
    supabase
      .from("seances")
      .select("id")
      .eq("etat", "faite")
      .eq("titre", seance.titre ?? "")
      .lt("jour", seance.jour)
      .order("jour", { ascending: false })
      .limit(1)
      .maybeSingle(),
    seance.programme_id
      ? supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("id", seance.programme_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const avant = precedente ? await chargerSeance(supabase, precedente.id) : null;

  const exos = seance.exercices_seance.map((e) => ({ ...e, charge_kg: e.charge_kg === null ? null : Number(e.charge_kg) }));
  const volume = volumeSeance(exos);
  const volumeAvant = avant ? volumeSeance(avant.exercices_seance.map((e) => ({ ...e, charge_kg: e.charge_kg === null ? null : Number(e.charge_kg) }))) : 0;
  const evolution = volume && volumeAvant ? Math.round(((volume - volumeAvant) / volumeAvant) * 100) : null;
  const seriesTotal = exos.reduce((a, e) => a + e.series, 0);
  const seriesFaites = exos.filter((e) => e.fait).reduce((a, e) => a + e.series, 0);
  const rates = exos.filter((e) => (e.realise as Realise | null)?.rate);
  const defi = defiSemaine(semaine ?? []);
  const pos = positionProgramme(prog, seance.jour);
  const contexte = [
    seance.titre,
    libelleFocus(seance.focus) ? `bloc ${libelleFocus(seance.focus)?.toLowerCase()}` : null,
    pos && !pos.avant && !pos.apres ? `S${pos.semaine}${pos.total ? `/${pos.total}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div data-module="sport" className="kv-ground relative min-h-dvh bg-surface-page text-fg-primary">
      {/* Contenu sous la zone sûre haute ; marge basse = barre d'action + indicateur d'accueil. */}
      <main
        className="kv-ground-content mx-auto flex max-w-lg flex-col gap-[var(--stack-md)] px-[var(--page-gutter)] pt-[calc(env(safe-area-inset-top)+var(--stack-xl))]"
        style={{ paddingBottom: "calc(var(--control-xl) + var(--stack-xl) * 2 + env(safe-area-inset-bottom))" }}
      >
        <span className="kv-tag kv-tag-success self-start">
          <Icon name="check" size={14} /> Séance terminée · {formatChrono(chronoSecondes(seance))}
        </span>
        <div>
          <h1 className="type-display-xl">{TITRES[seance.ressenti ?? 4] ?? "Solide."}</h1>
          <p className="mt-[var(--stack-xs)] type-body-lg text-fg-secondary">{contexte}</p>
        </div>

        <div className="grid grid-cols-2 gap-[var(--inline-md)]">
          <div className="kv-stat">
            <span className="kv-overline">Calories</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{Number(seance.kcal ?? 0)}</span>
              <span className="kv-mono">kcal</span>
            </span>
          </div>
          <div className="kv-stat">
            <span className="kv-overline">Volume</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{volume ? (volume / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—"}</span>
              {volume > 0 && <span className="kv-mono">t</span>}
            </span>
            {evolution !== null && (
              <span className={`kv-mono ${evolution >= 0 ? "!text-feedback-success-text" : ""}`}>
                {evolution >= 0 ? "+" : ""}
                {evolution} % vs dernière fois
              </span>
            )}
          </div>
          <div className="kv-stat">
            <span className="kv-overline">Séries</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{seriesFaites}</span>
              <span className="kv-mono">/ {seriesTotal}</span>
            </span>
          </div>
          <div className="kv-stat">
            <span className="kv-overline">Exercices</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{exos.length - rates.length}</span>
              <span className="kv-mono">/ {exos.length}</span>
            </span>
          </div>
        </div>

        {defi.total > 0 && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
            <span className={`kv-tag self-start ${defi.releve ? "kv-tag-success" : "kv-tag-brand"}`}>
              {defi.releve ? "Défi de la semaine relevé" : "Défi de la semaine"}
            </span>
            <p className="type-title-sm">
              {defi.total} séance{defi.total > 1 ? "s" : ""} de salle · {defi.faites}/{defi.total}
            </p>
            <div className="flex gap-[var(--inline-xs)]" aria-hidden>
              {Array.from({ length: defi.total }, (_, i) => (
                <span key={i} className={`h-2 flex-1 rounded-full ${i < defi.faites ? "bg-action-primary" : "bg-data-track"}`} />
              ))}
            </div>
          </section>
        )}

        {rates.map((e) => {
          const r = (e.realise as Realise | null)?.reprogramme;
          return (
            <section
              key={e.id}
              className="flex flex-col gap-[var(--stack-xs)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card"
            >
              <span className="kv-tag kv-tag-warning self-start">Exercice raté</span>
              <p className="type-title-sm">{nomAffiche(e.exercices_ref)}</p>
              <p className="type-body-sm text-fg-secondary">
                {r
                  ? `L’agent l’ajoute en fin de séance ${new Date(r.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" })}${r.titre ? ` (${r.titre})` : ""}, charge identique.`
                  : "Pas d’autre séance prévue dans le programme : il n’a pas été reprogrammé."}
              </p>
            </section>
          );
        })}
      </main>

      {/* Barre d'action au-dessus de l'indicateur d'accueil. */}
      <div className="fixed inset-x-0 bottom-0 z-20 px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-lg">
          <Link href={`/sport?jour=${seance.jour}&enregistree=1`} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
            <span className="kv-btn-label">Retour à l’accueil</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
