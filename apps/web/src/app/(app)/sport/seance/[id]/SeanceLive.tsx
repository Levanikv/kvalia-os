"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { chronoSecondes } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { chrono, cocher, demarrer, terminer } from "../../actions";
import { FicheExercice, type Repos } from "./FicheExercice";
import { VideoImmersive } from "./VideoImmersive";
import { formatChrono, useMaintenant } from "./temps";

export type SerieVue = { reps: number | null; charge_kg: number | null; le: string };
export type ExoVue = {
  id: string;
  exercice_id: string;
  nom: string;
  partie: string;
  image: string | null;
  video: string | null;
  series: number;
  reps: string;
  repos_s: number;
  kcal: number;
  fait: boolean;
  equipement: string | null;
  charge_kg: number | null;
  derniere: { charge_kg: number; jour: string } | null;
  substitut: boolean;
  seriesFaites: SerieVue[];
  rate: boolean;
};
export type SeanceVue = {
  id: string;
  jour: string;
  titre: string;
  sousTitre: string;
  surTitre: string;
  etat: string;
  kcal: number;
  kcalPrevues: number;
  duree_min: number | null;
  ressenti: number | null;
  debut_le: string | null;
  pause_le: string | null;
  pause_cumul_s: number;
  faite_le: string | null;
  estAujourdhui: boolean;
};
type Props = { seance: SeanceVue; exercices: ExoVue[] };

// Ressenti 1–5 : des mots, pas d'emoji (règle du design system).
export const RESSENTIS = [
  { v: 1, l: "Épuisé" },
  { v: 2, l: "Dur" },
  { v: 3, l: "Correct" },
  { v: 4, l: "Bien" },
  { v: 5, l: "Au top" },
];

/** Hauteur réservée en bas pour la barre d'action fixe (+ zone sûre ajoutée là où elle est utilisée). */
const BAS_CTA = "calc(var(--control-xl) + var(--stack-xl))";

const nbSeriesFaites = (e: ExoVue) => (e.fait ? e.series : Math.min(e.series, e.seriesFaites.length));

/**
 * La séance en direct. Toutes les écritures passent par les outils du noyau (demarrer_seance, chrono_seance,
 * valider_serie, cocher_exercice, remplacer_exercice, terminer_seance) ; l'écran garde une copie optimiste.
 */
export function SeanceLive({ seance: initiale, exercices }: Props) {
  const router = useRouter();
  const [, start] = useTransition();

  // Copie locale optimiste, resynchronisée quand le serveur renvoie de nouvelles données.
  const [source, setSource] = useState({ seance: initiale, exercices });
  const [seance, setSeance] = useState(initiale);
  const [exos, setExos] = useState(exercices);
  if (source.seance !== initiale || source.exercices !== exercices) {
    setSource({ seance: initiale, exercices });
    setSeance(initiale);
    setExos(exercices);
  }

  const [ouvert, setOuvert] = useState<string | null>(null);
  const [video, setVideo] = useState<string | null>(null);
  const [feuille, setFeuille] = useState<null | "rates" | "ressenti" | "quitter">(null);
  const [rates, setRates] = useState<string[]>([]);
  const [ressenti, setRessenti] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [toast, setToast] = useState<{ message: string; action?: { label: string; onClick: () => void } } | null>(null);
  const [repos, setRepos] = useState<Repos | null>(null);
  const fermerToast = useCallback(() => setToast(null), []);

  const faite = seance.etat === "faite";
  const enCours = seance.etat === "en_cours";
  const enPause = enCours && !!seance.pause_le;
  const lectureSeule = !faite && !enCours && !seance.estAujourdhui;
  const maintenant = useMaintenant(enCours && !enPause);
  const secondes = chronoSecondes(seance, new Date(maintenant));

  const faits = exos.filter((e) => e.fait).length;
  const seriesTotal = exos.reduce((a, e) => a + e.series, 0);
  const seriesFaites = exos.reduce((a, e) => a + nbSeriesFaites(e), 0);
  const kcal = faite ? seance.kcal : exos.filter((e) => e.fait).reduce((a, e) => a + e.kcal, 0);
  const enCoursId = enCours ? (exos.find((e) => !e.fait && !e.rate)?.id ?? null) : null;
  const exoOuvert = exos.find((e) => e.id === ouvert) ?? null;
  const exoVideo = exos.find((e) => e.id === video) ?? null;

  function majExo(id: string, f: (e: ExoVue) => ExoVue) {
    setExos((xs) => xs.map((e) => (e.id === id ? f(e) : e)));
  }

  /** Démarrage implicite (premier geste) : le noyau le fait aussi, on le reflète tout de suite. */
  function demarrerLocal() {
    if (seance.etat === "prevue") setSeance((s) => ({ ...s, etat: "en_cours", debut_le: s.debut_le ?? new Date().toISOString() }));
  }

  function lancer() {
    demarrerLocal();
    start(async () => {
      await demarrer(seance.id);
      router.refresh();
    });
  }

  function basculerPause() {
    if (!enCours) return;
    const action = enPause ? "reprendre" : "pause";
    const t = new Date().toISOString();
    setSeance((s) =>
      action === "pause"
        ? { ...s, pause_le: t }
        : { ...s, pause_le: null, pause_cumul_s: s.pause_cumul_s + Math.round((Date.now() - new Date(s.pause_le ?? t).getTime()) / 1000) },
    );
    // Le repos entre séries se fige avec le chrono.
    setRepos((r) => (r ? (action === "pause" ? { ...r, restant: restantRepos(r), depuis: null } : { ...r, depuis: Date.now() }) : r));
    start(async () => {
      await chrono(seance.id, action);
    });
  }

  function toggle(e: ExoVue) {
    if (faite || lectureSeule) return;
    const fait = !e.fait;
    if (fait) demarrerLocal();
    majExo(e.id, (x) => ({ ...x, fait }));
    if (fait) setToast({ message: `${e.nom} validé · ${e.series} / ${e.series} séries` });
    start(async () => {
      await cocher(e.id, fait);
      router.refresh();
    });
  }

  function demanderFin() {
    const restants = exos.filter((e) => !e.fait);
    setRates([]);
    setFeuille(restants.length > 0 ? "rates" : "ressenti");
  }

  function enregistrer() {
    setEnvoi(true);
    start(async () => {
      await terminer(seance.id, ressenti ?? undefined, notes.trim() || undefined, rates);
      router.push(`/sport/seance/${seance.id}/fin`);
    });
  }

  const cta = (() => {
    if (faite) return null;
    if (lectureSeule)
      return (
        <button type="button" disabled className="kv-btn kv-btn-tertiary kv-btn-xl kv-btn-block">
          <span className="kv-btn-label">
            Prévue {new Date(seance.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}
          </span>
        </button>
      );
    if (!enCours)
      return (
        <button type="button" onClick={lancer} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
          <Icon name="play_arrow" size={24} filled />
          <span className="kv-btn-label">Démarrer la séance</span>
        </button>
      );
    if (enPause)
      return (
        <button type="button" onClick={basculerPause} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
          <Icon name="play_arrow" size={24} filled />
          <span className="kv-btn-label">Reprendre la séance</span>
        </button>
      );
    const tout = exos.length === 0 || faits === exos.length;
    return (
      <button type="button" onClick={demanderFin} className={`kv-btn kv-btn-xl kv-btn-block ${tout ? "kv-btn-primary" : "kv-btn-secondary"}`}>
        <span className="kv-btn-label">Terminer la séance{exos.length ? ` · ${faits}/${exos.length}` : ""}</span>
      </button>
    );
  })();

  return (
    <div data-module="sport" className="kv-ground relative min-h-dvh bg-surface-page text-fg-primary">
      {/* En-tête : sous la barre d'état iPhone (zone sûre haute), jamais derrière l'encoche ou la Dynamic Island. */}
      <header className="sticky top-0 z-30 bg-surface-page/85 pt-safe backdrop-blur-md">
        <div className="mx-auto grid max-w-lg grid-cols-[auto_1fr_auto] items-center gap-[var(--inline-md)] px-[var(--page-gutter)] pt-[var(--stack-sm)]">
          {enCours ? (
            <button type="button" onClick={() => setFeuille("quitter")} className="kv-iconbtn kv-iconbtn-glass" aria-label="Quitter la séance">
              <Icon name="chevron_left" size={24} />
            </button>
          ) : (
            <Link href={`/sport?jour=${seance.jour}`} className="kv-iconbtn kv-iconbtn-glass" aria-label="Retour à l’accueil Sport">
              <Icon name="chevron_left" size={24} />
            </Link>
          )}
          <div className="flex justify-center">
            {!faite && !lectureSeule && (
              <button
                type="button"
                onClick={basculerPause}
                disabled={!enCours}
                aria-label={enCours ? (enPause ? "Reprendre le chrono" : "Mettre en pause") : "Chrono"}
                className={`flex h-[var(--control-lg)] items-center gap-[var(--inline-md)] rounded-[var(--radius-control)] px-[var(--inset-lg)] font-mono text-[20px] font-semibold tabular-nums ${
                  enPause ? "bg-action-tertiary text-fg-primary" : "bg-surface-container-inverse text-fg-inverse"
                }`}
              >
                {enPause ? (
                  <Icon name="pause" size={18} filled />
                ) : (
                  enCours && <span className="h-3 w-3 rounded-full bg-feedback-danger ring-4 ring-feedback-danger/30" aria-hidden />
                )}
                <span suppressHydrationWarning>{formatChrono(secondes)}</span>
              </button>
            )}
          </div>
          {enCoursId && !enPause ? (
            <button
              type="button"
              onClick={() => setOuvert(enCoursId)}
              className="kv-iconbtn kv-iconbtn-glass"
              aria-label="Exercice en cours : séries, charge, remplacer"
            >
              <Icon name="swap_horiz" size={22} />
            </button>
          ) : (
            <span className="w-[var(--control-md)]" aria-hidden />
          )}
        </div>
        <div className="mx-auto max-w-lg px-[var(--page-gutter)] pb-[var(--stack-sm)] pt-[var(--stack-md)]">
          {seance.surTitre && <p className="kv-overline truncate text-fg-brand">{seance.surTitre}</p>}
          <h1 className="flex items-baseline gap-[var(--inline-md)]">
            <span className="type-title-lg">{seance.titre}</span>
            {seance.sousTitre && <span className="truncate type-body-sm text-fg-secondary">{seance.sousTitre}</span>}
          </h1>
        </div>
      </header>

      <main
        className="kv-ground-content mx-auto flex max-w-lg flex-col gap-[var(--stack-lg)] px-[var(--page-gutter)] pt-[var(--stack-sm)]"
        style={{ paddingBottom: `calc(${BAS_CTA} + var(--stack-xl) + env(safe-area-inset-bottom))` }}
      >
        {faite && <Resume seance={seance} seriesTotal={seriesTotal} />}

        {/* Calories et progression */}
        {!faite && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
            <div className="flex items-end justify-between gap-[var(--inline-md)]">
              <p className="flex items-baseline gap-[var(--inline-sm)]">
                <span className="type-display-lg">{kcal}</span>
                <span className="kv-mono">kcal brûlées</span>
              </p>
              <p className="kv-mono">≈ {seance.kcalPrevues} prévues</p>
            </div>
            <BarreSeries exos={exos} seriesTotal={seriesTotal} seriesFaites={seriesFaites} />
            <p className="flex justify-between kv-overline text-fg-secondary">
              <span>
                {faits} / {exos.length} exercices
              </span>
              <span>
                {seriesFaites} / {seriesTotal} séries
              </span>
            </p>
          </section>
        )}

        {/* Exercices (Sport/Exercise row : À faire · En cours · En pause · Fait) */}
        {exos.length > 0 && (
          <ol className="flex flex-col gap-[var(--stack-sm)]">
            {exos.map((e, i) => {
              const actif = e.id === enCoursId;
              const n = nbSeriesFaites(e);
              const charge = e.charge_kg ?? e.derniere?.charge_kg ?? null;
              const meta = actif
                ? enPause
                  ? `En pause · série ${Math.min(n + 1, e.series)} / ${e.series}`
                  : `Série ${Math.min(n + 1, e.series)} / ${e.series}${charge !== null ? ` · ${charge} kg` : ""} · en cours`
                : [`${e.series} × ${e.reps}`, charge !== null ? `${charge} kg` : null, e.repos_s ? formatChrono(e.repos_s) : null].filter(Boolean).join(" · ");
              return (
                <li key={e.id} className={`kv-exo ${e.fait ? "is-done" : ""} ${actif ? "!border-line-brand-solid" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setVideo(e.id)}
                    aria-label={`Vidéo : ${e.nom}`}
                    className="kv-exo-thumb overflow-hidden"
                    style={e.image ? { backgroundImage: `url(${e.image})` } : undefined}
                  >
                    <span className="kv-exo-play" aria-hidden>
                      <Icon name="play_arrow" size={16} filled />
                    </span>
                  </button>
                  <button type="button" onClick={() => setOuvert(e.id)} className="kv-exo-main" aria-label={`Séries et charge : ${e.nom}`}>
                    <span className={`kv-exo-cap ${actif ? "!text-fg-brand" : ""}`}>
                      {String(i + 1).padStart(2, "0")} · {e.partie}
                      {e.substitut ? " · remplacé" : ""}
                      {e.rate ? " · raté" : ""}
                    </span>
                    <span className="kv-exo-title truncate">{e.nom}</span>
                    <span className="kv-exo-meta">{meta}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(e)}
                    disabled={faite || lectureSeule}
                    aria-pressed={e.fait}
                    aria-label={`${e.fait ? "Annuler" : "Valider"} : ${e.nom}`}
                    className={`kv-row-check ${e.fait ? "is-on" : ""}`}
                  >
                    <Icon name="check" size={20} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      {/* Barre d'action : au-dessus de l'indicateur d'accueil iPhone (zone sûre basse). */}
      {cta && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">{cta}</div>
        </div>
      )}

      <Toast message={toast?.message ?? null} action={toast?.action} onFermer={fermerToast} bas={cta ? BAS_CTA : "var(--stack-lg)"} />

      <FicheExercice
        exo={exoOuvert}
        index={exos.findIndex((e) => e.id === ouvert)}
        total={exos.length}
        seanceId={seance.id}
        modifiable={!faite && !lectureSeule}
        enPause={enPause}
        repos={repos && repos.exoId === ouvert ? repos : null}
        setRepos={setRepos}
        onFermer={() => setOuvert(null)}
        onSerie={(id, serie, fini) => {
          demarrerLocal();
          majExo(id, (x) => ({ ...x, seriesFaites: [...x.seriesFaites, serie], charge_kg: serie.charge_kg ?? x.charge_kg, fait: x.fait || fini }));
        }}
        onTermine={(e) => {
          setOuvert(null);
          setRepos(null);
          if (!e.fait) toggle(e);
          else setToast({ message: `${e.nom} validé · ${e.series} / ${e.series} séries` });
          router.refresh();
        }}
        onRemplace={(message, annuler) => {
          setOuvert(null);
          setToast({ message, action: { label: "Annuler", onClick: annuler } });
          router.refresh();
        }}
      />

      <VideoImmersive
        exo={exoVideo}
        index={exos.findIndex((e) => e.id === video)}
        total={exos.length}
        modifiable={!faite && !lectureSeule}
        onFermer={() => setVideo(null)}
        onTermine={(e) => {
          setVideo(null);
          if (!e.fait) toggle(e);
        }}
      />

      {/* C01 · Des exercices ratés ? */}
      <BottomSheet ouvert={feuille === "rates"} onFermer={() => setFeuille(null)} module="sport">
        <span className="kv-tag kv-tag-warning">
          {exos.filter((e) => !e.fait).length} exercice{exos.filter((e) => !e.fait).length > 1 ? "s" : ""} non coché
          {exos.filter((e) => !e.fait).length > 1 ? "s" : ""}
        </span>
        <h2 className="mt-[var(--stack-sm)] type-title-lg">Des exercices ratés ?</h2>
        <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
          Coche ceux que tu n’as pas faits : l’agent les reprogramme. Les autres sont comptés comme faits.
        </p>
        <ul className="mt-[var(--stack-md)] flex flex-col gap-[var(--stack-sm)]">
          {exos
            .filter((e) => !e.fait)
            .map((e) => {
              const on = rates.includes(e.id);
              return (
                <li key={e.id}>
                  <label className="tap flex items-center gap-[var(--inline-lg)] rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)]">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => setRates((r) => (on ? r.filter((x) => x !== e.id) : [...r, e.id]))}
                      className="h-5 w-5 accent-[var(--action-primary)]"
                    />
                    <span className="type-body-md">{e.nom}</span>
                  </label>
                </li>
              );
            })}
        </ul>
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setFeuille(null)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
            Reprendre
          </button>
          <button type="button" onClick={() => setFeuille("ressenti")} className="kv-btn kv-btn-primary kv-btn-lg flex-1">
            Terminer
          </button>
        </div>
      </BottomSheet>

      {/* A09 · Ressenti */}
      <BottomSheet ouvert={feuille === "ressenti"} onFermer={() => setFeuille(null)} titre="Comment c’était ?" module="sport">
        <div className="grid grid-cols-5 gap-[var(--inline-xs)]" role="radiogroup" aria-label="Ressenti">
          {RESSENTIS.map((r) => (
            <button
              key={r.v}
              type="button"
              role="radio"
              aria-checked={ressenti === r.v}
              onClick={() => setRessenti(r.v)}
              className={`flex flex-col items-center gap-[var(--stack-2xs)] rounded-[var(--radius-input)] py-[var(--inset-sm)] ${ressenti === r.v ? "bg-surface-container-inverse text-fg-inverse" : "border border-line-default text-fg-secondary"}`}
            >
              <span className="type-numeric-md">{r.v}</span>
              <span className="kv-mono text-inherit">{r.l}</span>
            </button>
          ))}
        </div>
        <label className="mt-[var(--stack-lg)] block">
          <span className="type-label-md">Une note ?</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Charge, douleur, record…"
            className="mt-[var(--stack-xs)] h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
          />
        </label>
        <p className="mt-[var(--stack-md)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-md)] py-[var(--inset-sm)] type-body-sm text-fg-secondary">
          <strong className="text-fg-primary">
            {exos.filter((e) => e.fait || !rates.includes(e.id)).reduce((a, e) => a + e.kcal, 0) || seance.kcalPrevues} kcal
          </strong>{" "}
          seront ajoutées à ta cible nutrition du jour.
          {rates.length > 0 && ` ${rates.length} exercice${rates.length > 1 ? "s" : ""} reprogrammé${rates.length > 1 ? "s" : ""} par l’agent.`}
        </p>
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setFeuille(null)} className="kv-btn kv-btn-outline kv-btn-lg flex-1">
            Annuler
          </button>
          <button type="button" onClick={enregistrer} disabled={envoi} className="kv-btn kv-btn-primary kv-btn-lg flex-[2]">
            {envoi ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </BottomSheet>

      {/* C03 · Quitter la séance */}
      <BottomSheet ouvert={feuille === "quitter"} onFermer={() => setFeuille(null)} module="sport">
        <h2 className="type-title-lg">Tu quittes la séance ?</h2>
        <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
          Le chrono continue ({formatChrono(secondes)}). Tu pourras reprendre depuis l’accueil Sport.
        </p>
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setFeuille(null)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
            Non, rester
          </button>
          <Link href={`/sport?jour=${seance.jour}`} className="kv-btn kv-btn-secondary kv-btn-lg flex-1">
            Oui, quitter
          </Link>
        </div>
      </BottomSheet>
    </div>
  );
}

/** Restant d'un repos à l'instant présent (gelé quand `depuis` est nul). */
export function restantRepos(r: Repos, maintenant = Date.now()) {
  return Math.max(0, r.restant - (r.depuis ? (maintenant - r.depuis) / 1000 : 0));
}

/** Barre de progression avec un repère à chaque fin d'exercice (en séries). */
function BarreSeries({ exos, seriesTotal, seriesFaites }: { exos: ExoVue[]; seriesTotal: number; seriesFaites: number }) {
  const reperes = exos.slice(0, -1).map((_, i) => exos.slice(0, i + 1).reduce((a, e) => a + e.series, 0) / Math.max(1, seriesTotal));
  return (
    <div className="kv-progress-track relative" aria-hidden>
      <div className="kv-progress-fill bg-action-primary" style={{ width: `${(seriesFaites / Math.max(1, seriesTotal)) * 100}%` }} />
      {reperes.map((r, i) => (
        <span key={i} className="absolute top-1/2 h-1/2 w-0.5 -translate-y-1/2 rounded-full bg-surface-container-default/80" style={{ left: `${r * 100}%` }} />
      ))}
    </div>
  );
}

/** D03 · Séance déjà faite, rouverte depuis la Home : stats, ressenti, ajustement nutrition. */
function Resume({ seance, seriesTotal }: { seance: SeanceVue; seriesTotal: number }) {
  return (
    <section className="flex flex-col gap-[var(--stack-md)]">
      <span className="kv-tag kv-tag-success self-start">
        Séance terminée
        {seance.faite_le ? ` · ${new Date(seance.faite_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
      </span>
      <div className="grid grid-cols-2 gap-[var(--inline-md)]">
        {[
          ["Calories", String(seance.kcal), "kcal"],
          ["Durée", String(seance.duree_min ?? "—"), "min"],
          ["Séries", String(seriesTotal), ""],
          ["Ressenti", RESSENTIS.find((r) => r.v === seance.ressenti)?.l ?? "—", ""],
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
      <Link
        href={`/nutrition?jour=${seance.jour}`}
        className="tap flex items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] type-body-sm"
      >
        <span>Cible nutrition du jour ajustée de +{seance.kcal} kcal</span>
        <Icon name="chevron_right" size={18} className="text-icon-tertiary" />
      </Link>
    </section>
  );
}
