import Link from "next/link";
import { chronoSecondes, seriesFaites } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ChronoTag } from "./ChronoTag";
import { formatChrono, libelleFocus, libellePartie, libelleType, type SeanceComplete } from "./lib";

type Props = {
  seance: SeanceComplete;
  kcalPrevues: number;
  estAujourdhui: boolean;
  /** Rang de la séance dans le programme (« 13/40 ») et semaine (« S3 »). */
  numero: { n: number; total: number } | null;
  semaineNo: number | null;
  /** « 1/2 » quand le jour porte plusieurs séances. */
  rang?: string | null;
};

/**
 * Sport/Ticket séance (Home workflow) : carte héros sombre en 4 états — À faire (aujourd'hui), En cours (chrono
 * vivant, « Reprendre »), Terminée (« Voir le résumé »), Prévue (un autre jour, « Voir la séance »).
 * L'état Repos est `TicketRepos`.
 */
export function HeroSeance({ seance: s, kcalPrevues, estAujourdhui, numero, semaineNo, rang }: Props) {
  const exos = s.exercices_seance;
  const faite = s.etat === "faite";
  const enCours = s.etat === "en_cours";
  const faits = exos.filter((e) => e.fait).length;
  const seriesTot = exos.reduce((a, e) => a + e.series, 0);
  const seriesOk = exos.reduce((a, e) => a + seriesFaites(e), 0);
  const parties = [...new Set(exos.map((e) => e.exercices_ref?.partie_corps).filter(Boolean))].slice(0, 3);
  const sousTitre = [libelleType(s.type), ...parties.map((p) => libellePartie(p ?? null).toLowerCase())].filter(Boolean).join(" · ");
  const dateCourte = new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  const tag = faite ? (
    <span className="kv-tag kv-tag-success">Terminée · {formatChrono(chronoSecondes(s))}</span>
  ) : enCours ? (
    <ChronoTag debut_le={s.debut_le} pause_le={s.pause_le} pause_cumul_s={s.pause_cumul_s} />
  ) : (
    <span className={`kv-tag ${estAujourdhui ? "kv-tag-brand" : "kv-tag-neutral"}`}>{estAujourdhui ? "Aujourd’hui" : dateCourte}</span>
  );

  const chiffres: Array<[string, string]> = faite
    ? [
        ["Durée", `${s.duree_min ?? "—"} min`],
        ["Séries", `${seriesOk} / ${seriesTot}`],
        ["Brûlé", `${Number(s.kcal ?? 0)} kcal`],
      ]
    : enCours
      ? [
          ["Exercices", `${faits} / ${exos.length}`],
          ["Séries", `${seriesOk} / ${seriesTot}`],
          ["Brûlé", `${Number(s.kcal ?? 0)} kcal`],
        ]
      : [
          ["Durée", `${s.duree_min ?? "—"} min`],
          ["Exercices", String(exos.length || "—")],
          ["Estimé", `≈ ${kcalPrevues} kcal`],
        ];

  const cta = faite ? "Voir le résumé" : enCours ? "Reprendre la séance" : estAujourdhui ? "Démarrer la séance" : "Voir la séance";
  const primaire = !faite && (enCours || estAujourdhui);

  return (
    <Link
      href={`/sport/seance/${s.id}`}
      data-module="sport"
      data-theme="dark"
      className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised active:opacity-95"
    >
      <div className="kv-ground-content flex flex-col gap-[var(--stack-lg)] p-[var(--inset-lg)]">
        <div className="flex items-center gap-[var(--inline-sm)]">
          {tag}
          {rang && <span className="kv-tag kv-tag-neutral">{rang}</span>}
          {(semaineNo || numero) && (
            <span className="kv-mono ml-auto">
              {[semaineNo ? `S${semaineNo}` : null, numero ? `${numero.n}/${numero.total}` : null].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <div>
          <h2 className="type-display-xl">{s.titre ?? libelleType(s.type)}</h2>
          <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">{sousTitre || libelleFocus(s.focus)}</p>
        </div>
        <dl className="grid grid-cols-3 gap-[var(--inline-lg)] border-t border-dashed border-line-default pt-[var(--stack-md)]">
          {chiffres.map(([k, v]) => (
            <div key={k}>
              <dt className="kv-overline">{k}</dt>
              <dd className="type-title-sm">{v}</dd>
            </div>
          ))}
        </dl>
        <span className={`kv-btn kv-btn-xl kv-btn-block kv-btn-has-end ${primaire ? "kv-btn-primary" : "kv-btn-tertiary"}`}>
          <span className="kv-btn-label">{cta}</span>
          <span className="kv-btn-end">
            <Icon name="arrow_forward" size={22} />
          </span>
        </span>
      </div>
    </Link>
  );
}

type ReposProps = {
  prochaine: { id: string; jour: string; titre: string | null; type: string } | null;
  semaine: { faites: number; total: number };
  semaineNo: number | null;
};

/** Sport/Ticket séance · État Repos (D04) : récupération active, prochaine séance, avancement de la semaine. */
export function TicketRepos({ prochaine, semaine, semaineNo }: ReposProps) {
  const jourProchaine = prochaine ? new Date(prochaine.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short" }) : null;
  const contenu = (
    <div className="kv-ground-content flex flex-col gap-[var(--stack-lg)] p-[var(--inset-lg)]">
      <div className="flex items-center gap-[var(--inline-sm)]">
        <span className="kv-tag kv-tag-neutral">Repos · récupération active</span>
        {semaineNo && <span className="kv-mono ml-auto">S{semaineNo} · repos</span>}
      </div>
      <div>
        <h2 className="type-display-xl">Récup.</h2>
        <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">Marche · mobilité · sommeil</p>
      </div>
      <dl className="grid grid-cols-3 gap-[var(--inline-lg)] border-t border-dashed border-line-default pt-[var(--stack-md)]">
        <div>
          <dt className="kv-overline">Prochaine</dt>
          <dd className="truncate type-title-sm">{prochaine ? `${prochaine.titre ?? libelleType(prochaine.type)} · ${jourProchaine}` : "—"}</dd>
        </div>
        <div>
          <dt className="kv-overline">Semaine</dt>
          <dd className="type-title-sm">
            {semaine.faites} / {semaine.total}
          </dd>
        </div>
        <div>
          <dt className="kv-overline">Conseil</dt>
          <dd className="type-title-sm">≈ 8 000 pas</dd>
        </div>
      </dl>
      {prochaine && (
        <span className="kv-btn kv-btn-tertiary kv-btn-xl kv-btn-block kv-btn-has-end">
          <span className="kv-btn-label">Voir la prochaine séance</span>
          <span className="kv-btn-end">
            <Icon name="arrow_forward" size={22} />
          </span>
        </span>
      )}
    </div>
  );
  const classes = "kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised";
  return prochaine ? (
    <Link href={`/sport/seance/${prochaine.id}`} data-module="sport" data-theme="dark" className={`${classes} active:opacity-95`}>
      {contenu}
    </Link>
  ) : (
    <section data-module="sport" data-theme="dark" className={classes}>
      {contenu}
    </section>
  );
}
