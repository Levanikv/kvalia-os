"use client";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { equivalentsAction, historiqueAction, noterChargeAction, remplacerAction, validerSerieAction } from "../../actions";
import { libelleMateriel, nomAffiche } from "../../lib";
import type { ExoVue, SerieVue } from "./SeanceLive";
import { formatChrono, useMaintenant } from "./temps";

/** Repos entre deux séries : `restant` secondes à partir de `depuis` (ms) ; `depuis` nul = gelé (séance en pause). */
export type Repos = { exoId: string; total: number; restant: number; depuis: number | null; serieValidee: number };

type Equivalent = { id: string; nom: string; nom_fr: string | null; partie_corps: string | null; equipement: string | null; raison: string };
type Histo = { id: string; jour: string; charge_kg: number; series: number; reps: string; reps_faites: number | null };

type Props = {
  exo: ExoVue | null;
  index: number;
  total: number;
  seanceId: string;
  /** Faux pour une séance faite ou prévue un autre jour : lecture seule. */
  modifiable: boolean;
  enPause: boolean;
  repos: Repos | null;
  setRepos: (r: Repos | null | ((r: Repos | null) => Repos | null)) => void;
  onFermer: () => void;
  onSerie: (exoId: string, serie: SerieVue, exerciceFini: boolean) => void;
  onTermine: (exo: ExoVue) => void;
  onRemplace: (message: string, annuler: () => void) => void;
};

/**
 * Fiche d'un exercice de la séance (A04 → A06, B05, B02) : séries (Faite / En cours / À faire), minuteur de repos
 * (−15 s, +15 s, Passer), charge du jour, historique et charge max, remplacement par un équivalent.
 */
export function FicheExercice(props: Props) {
  const { exo, onFermer } = props;
  return (
    <BottomSheet ouvert={!!exo} onFermer={onFermer} titre={exo?.nom} module="sport">
      {exo && <Contenu key={exo.id} {...props} exo={exo} />}
    </BottomSheet>
  );
}

function Contenu({ exo, index, total, modifiable, enPause, repos, setRepos, onSerie, onTermine, onRemplace }: Props & { exo: ExoVue }) {
  const [, start] = useTransition();
  const [mode, setMode] = useState<"series" | "historique" | "remplacer">("series");
  const [charge, setCharge] = useState<number | null>(exo.charge_kg ?? exo.derniere?.charge_kg ?? null);
  const [histo, setHisto] = useState<Histo[] | null>(null);
  const [equiv, setEquiv] = useState<Equivalent[] | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [portee, setPortee] = useState<"seance" | "programme">("seance");
  const [occupe, setOccupe] = useState(false);
  const maintenant = useMaintenant(!!repos?.depuis);

  const pas = exo.equipement === "dumbbell" ? 1 : 2.5;
  const faites = exo.fait ? exo.series : Math.min(exo.series, exo.seriesFaites.length);
  const toutFait = faites >= exo.series;
  const restant = repos ? Math.max(0, repos.restant - (repos.depuis ? (maintenant - repos.depuis) / 1000 : 0)) : 0;
  const auRepos = !!repos && restant > 0;
  const repsNum = (() => {
    const m = /^(\d+)/.exec(exo.reps.trim());
    return m && !/^\d+\s*(s|sec|min)\b/i.test(exo.reps.trim()) ? Number(m[1]) : null;
  })();

  function changerCharge(v: number | null) {
    setCharge(v);
    start(async () => {
      await noterChargeAction(exo.id, { charge_kg: v });
    });
  }

  function validerSerie() {
    if (toutFait) return;
    const serie: SerieVue = { reps: repsNum, charge_kg: charge, le: new Date().toISOString() };
    const fini = faites + 1 >= exo.series;
    onSerie(exo.id, serie, fini);
    setRepos(
      fini || !exo.repos_s ? null : { exoId: exo.id, total: exo.repos_s, restant: exo.repos_s, depuis: enPause ? null : Date.now(), serieValidee: faites + 1 },
    );
    start(async () => {
      await validerSerieAction(exo.id, { charge_kg: charge });
    });
  }

  function ouvrirHistorique() {
    setMode("historique");
    if (!histo)
      start(async () => {
        setHisto(await historiqueAction(exo.exercice_id));
      });
  }

  function ouvrirRemplacer() {
    setMode("remplacer");
    if (!equiv)
      start(async () => {
        const liste = await equivalentsAction(exo.id);
        setEquiv(liste);
        setChoix(liste[0]?.id ?? null);
      });
  }

  function remplacer() {
    const nouveau = equiv?.find((q) => q.id === choix);
    if (!nouveau) return;
    setOccupe(true);
    const ancien = exo.exercice_id;
    start(async () => {
      await remplacerAction(exo.id, nouveau.id, portee);
      setOccupe(false);
      onRemplace(`${nomAffiche(nouveau)} remplace ${exo.nom}`, () => {
        void remplacerAction(exo.id, ancien, portee);
      });
    });
  }

  const actions = modifiable ? (
    <div className="flex gap-[var(--inline-md)]">
      <button type="button" onClick={ouvrirRemplacer} className="kv-btn kv-btn-outline kv-btn-lg flex-1">
        Remplacer
      </button>
      {toutFait ? (
        <button type="button" onClick={() => onTermine({ ...exo, fait: true })} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.4]">
          Exercice terminé
        </button>
      ) : (
        <button type="button" onClick={validerSerie} disabled={auRepos} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.4]">
          Valider la série {faites + 1}
        </button>
      )}
    </div>
  ) : null;

  const tags = (
    <div className="flex flex-wrap gap-[var(--inline-sm)]">
      <span className="kv-tag kv-tag-neutral">
        Exercice {index + 1} / {total}
      </span>
      {exo.partie && <span className="kv-tag kv-tag-brand">{exo.partie}</span>}
      {exo.substitut && <span className="kv-tag kv-tag-neutral">Remplacé</span>}
    </div>
  );

  const stepper = (
    <div className="flex items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-tile)] border border-line-brand bg-surface-container-brand-subtle px-[var(--inset-md)] py-[var(--inset-sm)]">
      <div>
        <p className="kv-overline">Charge du jour</p>
        <p className="type-display-md">{charge === null ? "—" : `${String(charge).replace(".", ",")} kg`}</p>
      </div>
      {modifiable && (
        <div className="flex gap-[var(--inline-md)]">
          <button
            type="button"
            onClick={() => changerCharge(Math.max(0, (charge ?? 0) - pas))}
            className="kv-iconbtn kv-iconbtn-lg border border-line-default bg-surface-container-default"
            aria-label={`Moins ${pas} kg`}
          >
            <Icon name="remove" size={24} />
          </button>
          <button
            type="button"
            onClick={() => changerCharge((charge ?? 0) + pas)}
            className="kv-iconbtn kv-iconbtn-lg kv-iconbtn-primary"
            aria-label={`Plus ${pas} kg`}
          >
            <Icon name="add" size={24} />
          </button>
        </div>
      )}
    </div>
  );

  if (mode === "remplacer")
    return (
      <div className="flex flex-col gap-[var(--stack-md)]">
        <button
          type="button"
          onClick={() => setMode("series")}
          className="tap flex items-center gap-[var(--inline-xs)] self-start type-label-md text-fg-secondary"
        >
          <Icon name="chevron_left" size={20} /> Séries
        </button>
        <div>
          <p className="type-title-md">Remplacer {exo.nom}</p>
          <p className="type-body-sm text-fg-secondary">Même muscle{exo.partie ? ` : ${exo.partie.toLowerCase()}` : ""} · matériel de ta salle</p>
        </div>
        {!equiv ? (
          <p className="py-[var(--stack-xl)] text-center type-body-sm text-fg-tertiary">L’agent cherche des équivalents…</p>
        ) : equiv.length === 0 ? (
          <p className="py-[var(--stack-xl)] text-center type-body-sm text-fg-tertiary">Aucun équivalent avec ton matériel.</p>
        ) : (
          <ul className="flex flex-col gap-[var(--stack-sm)]" role="radiogroup" aria-label="Équivalents">
            {equiv.map((q, i) => {
              const on = choix === q.id;
              return (
                <li key={q.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setChoix(q.id)}
                    className={`flex w-full items-center gap-[var(--inline-lg)] rounded-[var(--radius-tile)] border p-[var(--inset-sm)] text-left ${on ? "border-line-brand-solid bg-surface-container-brand-subtle" : "border-line-default bg-surface-container-default"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-[var(--inline-sm)]">
                        <span className="kv-exo-cap">{i === 0 ? "Recommandé" : "Équivalent"}</span>
                        {i === 0 && (
                          <span className="kv-tag kv-tag-info">
                            <Icon name="auto_awesome" size={12} /> Agent
                          </span>
                        )}
                      </span>
                      <span className="block truncate kv-exo-title">{nomAffiche(q)}</span>
                      <span className="block truncate kv-exo-meta">
                        {exo.series} × {exo.reps}
                        {q.equipement ? ` · ${libelleMateriel(q.equipement)}` : ""}
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-action-primary" : "border-line-strong"}`}
                      aria-hidden
                    >
                      {on && <span className="h-3 w-3 rounded-full bg-action-primary" />}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="kv-seg" role="radiogroup" aria-label="Portée du remplacement">
          {(
            [
              ["seance", "Cette séance"],
              ["programme", "Tout le programme"],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={portee === v}
              onClick={() => setPortee(v)}
              className={`kv-seg-item ${portee === v ? "is-on" : ""}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setMode("series")} className="kv-btn kv-btn-outline kv-btn-lg flex-1">
            Annuler
          </button>
          <button type="button" onClick={remplacer} disabled={!choix || occupe} className="kv-btn kv-btn-primary kv-btn-lg flex-[2]">
            {occupe ? "…" : "Remplacer"}
          </button>
        </div>
      </div>
    );

  if (mode === "historique") {
    const six = (histo ?? []).slice(0, 6).reverse();
    const record = Math.max(0, ...(histo ?? []).map((h) => h.charge_kg));
    const meilleur = (histo ?? []).find((h) => h.charge_kg === record);
    const reps1 = meilleur ? (meilleur.reps_faites ?? Number(/^(\d+)/.exec(meilleur.reps)?.[1] ?? 0)) : 0;
    const unRm = record && reps1 ? Math.round(record * (1 + reps1 / 30) * 2) / 2 : null; // Epley
    const max = Math.max(1, ...six.map((h) => h.charge_kg));
    return (
      <div className="flex flex-col gap-[var(--stack-md)]">
        <button
          type="button"
          onClick={() => setMode("series")}
          className="tap flex items-center gap-[var(--inline-xs)] self-start type-label-md text-fg-secondary"
        >
          <Icon name="chevron_left" size={20} /> Séries
        </button>
        {tags}
        <div className="grid grid-cols-3 gap-[var(--inline-md)]">
          {[
            ["Séries", `${exo.series}×${exo.reps}`, ""],
            ["Repos", exo.repos_s ? formatChrono(exo.repos_s) : "—", ""],
            ["Record", record ? String(record).replace(".", ",") : "—", record ? "kg" : ""],
          ].map(([k, v, u]) => (
            <div key={k} className="kv-stat">
              <span className="kv-overline">{k}</span>
              <span className="kv-stat-row">
                <span className="kv-stat-value">{v}</span>
                {u && <span className="kv-mono">{u}</span>}
              </span>
            </div>
          ))}
        </div>
        <section className="rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)]">
          <div className="flex justify-between">
            <span className="kv-overline">
              Charge max · {six.length} séance{six.length > 1 ? "s" : ""}
            </span>
            {unRm && <span className="kv-mono">1RM ≈ {String(unRm).replace(".", ",")} kg</span>}
          </div>
          {histo === null ? (
            <p className="py-[var(--stack-lg)] text-center type-body-sm text-fg-tertiary">Chargement…</p>
          ) : six.length === 0 ? (
            <p className="py-[var(--stack-lg)] text-center type-body-sm text-fg-tertiary">Pas encore de charge notée : valide une série pour commencer.</p>
          ) : (
            <ol className="mt-[var(--stack-md)] flex h-28 items-end gap-[var(--inline-sm)]" aria-label="Charges des dernières séances">
              {six.map((h, i) => (
                <li key={h.id} className="flex flex-1 flex-col items-center justify-end gap-[var(--stack-2xs)]">
                  <span className="kv-mono">{String(h.charge_kg).replace(".", ",")}</span>
                  <span
                    className={`w-full rounded-t-[var(--radius-sm)] ${i === six.length - 1 ? "bg-action-primary" : "bg-action-tertiary"}`}
                    style={{ height: `${Math.max(8, (h.charge_kg / max) * 72)}px` }}
                    title={new Date(h.jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  />
                </li>
              ))}
            </ol>
          )}
        </section>
        {stepper}
        {actions}
      </div>
    );
  }

  const charges = (i: number) => exo.seriesFaites[i]?.charge_kg ?? charge;
  const repsDe = (i: number) => exo.seriesFaites[i]?.reps ?? repsNum;
  const ilYa = (i: number) => {
    const le = exo.seriesFaites[i]?.le;
    return le && maintenant - new Date(le).getTime() < 90_000;
  };

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      {tags}

      {/* A05 · Minuteur de repos */}
      {repos && auRepos && (
        <section
          data-theme="dark"
          data-module="sport"
          className="rounded-[var(--radius-card)] bg-surface-container-inverse p-[var(--inset-md)] text-fg-primary shadow-floating"
        >
          <div className="flex justify-between gap-[var(--inline-md)]">
            <span className="kv-overline text-fg-secondary">
              Repos · série {repos.serieValidee}/{exo.series} validée
            </span>
            <span className="kv-mono">Ensuite : série {repos.serieValidee + 1}</span>
          </div>
          <p className="type-display-lg tabular-nums" aria-live="off">
            {formatChrono(restant)}
            {!repos.depuis && <span className="kv-mono"> · en pause</span>}
          </p>
          <div className="kv-progress-track mt-[var(--stack-xs)]" aria-hidden>
            <div className="kv-progress-fill bg-action-primary" style={{ width: `${(restant / Math.max(1, repos.total)) * 100}%` }} />
          </div>
          <div className="mt-[var(--stack-md)] grid grid-cols-3 gap-[var(--inline-md)]">
            <button
              type="button"
              onClick={() => setRepos((r) => (r ? { ...r, restant: Math.max(1, restant - 15), depuis: r.depuis ? Date.now() : null } : r))}
              className="kv-btn kv-btn-outline kv-btn-md"
            >
              −15 s
            </button>
            <button
              type="button"
              onClick={() => setRepos((r) => (r ? { ...r, restant: restant + 15, total: r.total + 15, depuis: r.depuis ? Date.now() : null } : r))}
              className="kv-btn kv-btn-outline kv-btn-md"
            >
              +15 s
            </button>
            <button type="button" onClick={() => setRepos(null)} className="kv-btn kv-btn-primary kv-btn-md">
              Passer
            </button>
          </div>
        </section>
      )}

      {/* Sport/Série : Faite · En cours · À faire */}
      <ol className="flex flex-col gap-[var(--stack-sm)]">
        {Array.from({ length: exo.series }, (_, i) => {
          const faite = i < faites;
          const courante = !faite && i === faites && modifiable;
          const etat = faite ? (ilYa(i) ? "Faite · à l’instant" : "Faite") : courante ? (auRepos ? "Après le repos" : "En cours") : "À faire";
          const c = charges(i);
          const r = repsDe(i);
          return (
            <li
              key={i}
              className={`flex items-center gap-[var(--inline-lg)] rounded-[var(--radius-tile)] border p-[var(--inset-sm)] ${
                faite
                  ? "border-transparent bg-surface-container-sunken"
                  : courante && !auRepos
                    ? "border-line-brand-solid bg-surface-container-default"
                    : "border-line-default bg-surface-container-default"
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full type-label-md ${courante && !auRepos ? "bg-action-primary text-fg-on-brand" : "bg-surface-container-default text-fg-secondary"}`}
              >
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block type-label-lg">
                  {r !== null ? `${r} reps` : exo.reps}
                  {c !== null ? ` · ${String(c).replace(".", ",")} kg` : ""}
                </span>
                <span className={`block kv-mono ${courante && !auRepos ? "!text-fg-brand" : ""}`}>{etat}</span>
              </span>
              <button
                type="button"
                onClick={courante && !auRepos ? validerSerie : undefined}
                disabled={!courante || auRepos}
                aria-label={faite ? `Série ${i + 1} faite` : `Valider la série ${i + 1}`}
                className={`kv-row-check ${faite ? "is-on" : ""}`}
              >
                <Icon name="check" size={20} />
              </button>
            </li>
          );
        })}
      </ol>

      {stepper}

      <div className="flex flex-wrap items-center justify-between gap-[var(--inline-md)] type-body-sm text-fg-secondary">
        <span>
          {exo.derniere
            ? `Dernière fois : ${String(exo.derniere.charge_kg).replace(".", ",")} kg · ${new Date(exo.derniere.jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
            : "Première fois sur cet exercice."}
        </span>
        <button type="button" onClick={ouvrirHistorique} className="tap flex items-center gap-[var(--inline-xs)] type-label-md text-fg-link">
          Historique <Icon name="chevron_right" size={18} />
        </button>
      </div>

      {actions}
    </div>
  );
}
