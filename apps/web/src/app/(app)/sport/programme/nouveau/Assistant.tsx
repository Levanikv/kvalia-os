"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { LIBELLES, type ParametresSport, phasesProgramme, planSemaine } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { enregistrerParametres, genererProgramme } from "../../actions";

type Props = {
  initial: ParametresSport;
  auj: string;
  poids: { valeur: number; source: string };
  programme: { nom: string; fin: string | null } | null;
  materiels: Array<[string, number]>;
};

const OBJECTIFS: Array<{ v: ParametresSport["objectif"]; icone: string; ligne: string; detail: string }> = [
  { v: "hypertrophie", icone: "fitness_center", ligne: "Construire du muscle", detail: "8–12 reps · volume qui monte chaque semaine" },
  { v: "force", icone: "weight", ligne: "Soulever plus lourd", detail: "5–6 reps sur les composés · repos longs" },
  { v: "perte_de_gras", icone: "local_fire_department", ligne: "Sécher en gardant le muscle", detail: "Muscu + finisher cardio en fin de séance" },
  { v: "endurance", icone: "directions_run", ligne: "Tenir plus longtemps", detail: "15 reps · repos courts · densité" },
];
const NIVEAUX: Array<{ v: ParametresSport["niveau"]; ligne: string; barres: number }> = [
  { v: "beginner", ligne: "Moins de 6 mois de pratique régulière", barres: 1 },
  { v: "intermediate", ligne: "De 6 mois à 2 ans, les mouvements de base sont acquis", barres: 2 },
  { v: "advanced", ligne: "Plus de 2 ans, tu connais tes charges", barres: 3 },
];
const JOURS = [
  { v: 1, l: "Lundi" },
  { v: 2, l: "Mardi" },
  { v: 3, l: "Mercredi" },
  { v: 4, l: "Jeudi" },
  { v: 5, l: "Vendredi" },
  { v: 6, l: "Samedi" },
  { v: 0, l: "Dimanche" },
];
const PRESETS_MATERIEL: Array<{ l: string; icone: string; m: string[] }> = [
  {
    l: "Salle complète",
    icone: "apartment",
    m: ["barbell", "dumbbell", "cable", "leverage machine", "body weight", "ez barbell", "smith machine", "weighted", "sled machine"],
  },
  { l: "Haltères à la maison", icone: "home", m: ["dumbbell", "body weight", "band"] },
  { l: "Poids du corps", icone: "accessibility_new", m: ["body weight"] },
];
const ETAPES = ["Objectif", "Niveau", "Semaine", "Séance", "Matériel", "Aperçu"];
const MESSAGES = [
  "Lecture de tes réglages…",
  "Choix des exercices dans la bibliothèque…",
  "Progression : volume, puis charge…",
  "Placement des semaines de décharge…",
  "Calcul des calories de chaque séance…",
  "Dernières vérifications…",
];
const TEINTE: Record<string, string> = {
  hypertrophie: "bg-action-primary",
  force: "bg-action-primary/70",
  mixte: "bg-action-primary/45",
  deload: "bg-surface-sunken",
};

type Resultat = { nb_seances: number; nb_exercices: number; debut: string; fin: string; avertissements: string[] };

/**
 * Parcours plein écran (façon apps de coaching) : une question par écran, de grandes cartes, une barre de progression,
 * puis un aperçu concret (semaine type, frise des blocs) avant de générer. Muscu et boxe peuvent tomber le même jour.
 */
export function Assistant({ initial, auj, poids, programme, materiels }: Props) {
  const router = useRouter();
  const [etape, setEtape] = useState(0);
  const [p, setP] = useState<ParametresSport>(initial);
  const [debut, setDebut] = useState<"lundi" | "aujourdhui" | string>("lundi");
  const [phase, setPhase] = useState<"saisie" | "generation" | "fini">("saisie");
  const [message, setMessage] = useState(0);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [, start] = useTransition();

  const plan = useMemo(() => planSemaine(p), [p]);
  const phases = useMemo(() => phasesProgramme(p), [p]);

  useEffect(() => {
    if (phase !== "generation") return;
    const t = setInterval(() => setMessage((m) => Math.min(m + 1, MESSAGES.length - 1)), 900);
    return () => clearInterval(t);
  }, [phase]);

  function maj<K extends keyof ParametresSport>(k: K, v: ParametresSport[K]) {
    setP((x) => ({ ...x, [k]: v }));
  }
  /** Les compteurs suivent les jours cochés : un jour coché = une séance. */
  function basculer(liste: "jours_salle" | "jours_boxe", j: number) {
    setP((x) => {
      const max = liste === "jours_salle" ? 6 : 3;
      const cur = x[liste];
      const suivant = cur.includes(j) ? cur.filter((y) => y !== j) : cur.length >= max ? cur : [...cur, j].sort((a, b) => a - b);
      const rythme = liste === "jours_salle" ? { ...x.rythme, salle: suivant.length } : { ...x.rythme, boxe: suivant.length };
      return { ...x, [liste]: suivant, rythme };
    });
  }

  const peutContinuer = etape === 2 ? p.jours_salle.length + p.jours_boxe.length > 0 : etape === 4 ? p.materiel.length > 0 : true;

  function generer() {
    setErreur(null);
    setMessage(0);
    setPhase("generation");
    const debutIso = debut === "lundi" ? undefined : debut === "aujourdhui" ? auj : debut;
    const params: ParametresSport = {
      ...p,
      rythme: { salle: p.jours_salle.length, boxe: p.jours_boxe.length },
    };
    start(async () => {
      try {
        await enregistrerParametres(params);
        const [r] = await Promise.all([genererProgramme(params, debutIso), new Promise((ok) => setTimeout(ok, 2400))]);
        setResultat(r);
        setPhase("fini");
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
        setPhase("saisie");
      }
    });
  }

  if (phase === "generation") return <EcranGeneration message={MESSAGES[message]} progression={(message + 1) / MESSAGES.length} />;
  if (phase === "fini" && resultat) return <EcranFini r={resultat} objectif={p.objectif} />;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pt-safe">
      {/* En-tête : fermer + progression */}
      <header className="flex h-[var(--header-h)] items-center gap-3">
        {etape === 0 ? (
          <Link href="/sport/programme" className="tap flex w-10 items-center justify-center rounded-full" aria-label="Fermer">
            <Icon name="close" size={24} />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setEtape((e) => e - 1)}
            className="tap flex w-10 items-center justify-center rounded-full"
            aria-label="Étape précédente"
          >
            <Icon name="arrow_back" size={24} />
          </button>
        )}
        <div className="flex flex-1 gap-1" role="progressbar" aria-valuemin={1} aria-valuemax={ETAPES.length} aria-valuenow={etape + 1}>
          {ETAPES.map((e, i) => (
            <span key={e} className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i <= etape ? "bg-action-primary" : "bg-surface-sunken"}`} />
          ))}
        </div>
        <span className="w-10 text-right text-xs tabular-nums text-fg-tertiary">
          {etape + 1}/{ETAPES.length}
        </span>
      </header>

      <main key={etape} className="assistant-etape flex-1 pb-32 pt-4">
        {etape === 0 && (
          <Etape
            titre="Quel est ton objectif ?"
            sous={programme ? `Ton programme actuel : ${programme.nom}.` : "Tout le programme en découle : séries, reps, repos."}
          >
            <div className="grid gap-3">
              {OBJECTIFS.map((o) => (
                <GrandChoix key={o.v} actif={p.objectif === o.v} onClick={() => maj("objectif", o.v)}>
                  <span
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${p.objectif === o.v ? "bg-action-primary text-fg-on-brand" : "bg-surface-sunken text-fg-brand"}`}
                  >
                    <Icon name={o.icone} size={26} filled={p.objectif === o.v} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold tracking-tight">{LIBELLES.objectif[o.v]}</span>
                    <span className="block text-sm text-fg-secondary">{o.ligne}</span>
                    <span className="block text-xs text-fg-tertiary">{o.detail}</span>
                  </span>
                </GrandChoix>
              ))}
            </div>
          </Etape>
        )}

        {etape === 1 && (
          <Etape titre="Où en es-tu ?" sous="Le niveau filtre les exercices trop techniques et règle la difficulté.">
            <div className="grid gap-3">
              {NIVEAUX.map((n) => (
                <GrandChoix key={n.v} actif={p.niveau === n.v} onClick={() => maj("niveau", n.v)}>
                  <span className="flex h-12 w-12 shrink-0 items-end justify-center gap-1 rounded-xl bg-surface-sunken pb-3" aria-hidden>
                    {[1, 2, 3].map((b) => (
                      <span key={b} className={`w-1.5 rounded-full ${b <= n.barres ? "bg-action-primary" : "bg-line-default"}`} style={{ height: 6 + b * 6 }} />
                    ))}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold tracking-tight">{LIBELLES.niveau[n.v]}</span>
                    <span className="block text-sm text-fg-secondary">{n.ligne}</span>
                  </span>
                </GrandChoix>
              ))}
            </div>
          </Etape>
        )}

        {etape === 2 && (
          <Etape titre="Ta semaine type" sous="Coche tes jours de muscu et de boxe. Les deux le même jour ? C’est possible : double séance.">
            <ul className="divide-y divide-line-default overflow-hidden rounded-xl border border-line-default bg-surface-default">
              {JOURS.map((j) => {
                const salle = p.jours_salle.includes(j.v);
                const boxe = p.jours_boxe.includes(j.v);
                const seances = plan.jours[j.v];
                return (
                  <li key={j.v} className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{j.l}</p>
                      <p className="truncate text-xs text-fg-tertiary">
                        {seances.length === 0 ? "Repos" : seances.map((s) => s.titre.replace(" — sac, shadow, corde", "")).join(" + ")}
                      </p>
                    </div>
                    {salle && boxe && <span className="rounded-full bg-surface-brand-subtle px-2 py-0.5 text-[10px] font-semibold text-fg-brand">×2</span>}
                    <Pastille actif={salle} icone="fitness_center" label={`Muscu le ${j.l.toLowerCase()}`} onClick={() => basculer("jours_salle", j.v)} />
                    <Pastille actif={boxe} icone="sports_mma" boxe label={`Boxe le ${j.l.toLowerCase()}`} onClick={() => basculer("jours_boxe", j.v)} />
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <Stat valeur={p.jours_salle.length} label="muscu" />
              <Stat valeur={p.jours_boxe.length} label="boxe" />
              <Stat valeur={7 - new Set([...p.jours_salle, ...p.jours_boxe]).size} label="repos" />
            </div>
            <p className="mt-3 text-xs text-fg-tertiary">Jusqu’à 6 séances de muscu et 3 de boxe par semaine.</p>
          </Etape>
        )}

        {etape === 3 && (
          <Etape titre="Tes séances" sous="Le générateur ajuste le nombre d’exercices pour tenir dans ce temps, échauffement compris.">
            <div className="rounded-xl border border-line-default bg-surface-default p-5 text-center">
              <p className="text-6xl font-semibold tracking-tight tabular-nums">
                {p.duree_min}
                <span className="text-xl font-normal text-fg-secondary"> min</span>
              </p>
              <input
                type="range"
                min={30}
                max={120}
                step={5}
                value={p.duree_min}
                onChange={(e) => maj("duree_min", Number(e.target.value))}
                aria-label="Durée d’une séance"
                className="mt-4 w-full accent-[var(--action-primary)]"
              />
              <div className="flex justify-between text-[10px] text-fg-tertiary">
                <span>30</span>
                <span>75</span>
                <span>120</span>
              </div>
            </div>

            <p className="mt-6 text-sm font-semibold">Durée du programme</p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {[4, 8, 12, 16].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => maj("semaines", n)}
                  aria-pressed={p.semaines === n}
                  className={`tap rounded-xl text-sm font-semibold transition-colors ${p.semaines === n ? "bg-action-primary text-fg-on-brand" : "bg-surface-default text-fg-secondary"}`}
                >
                  {n} sem.
                </button>
              ))}
            </div>

            <p className="mt-6 text-sm font-semibold">On commence…</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["lundi", "Lundi prochain"],
                  ["aujourdhui", "Aujourd’hui"],
                ] as const
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setDebut(v)}
                  aria-pressed={debut === v}
                  className={`tap rounded-xl text-sm font-semibold transition-colors ${debut === v ? "bg-action-primary text-fg-on-brand" : "bg-surface-default text-fg-secondary"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <label className="mt-2 flex items-center justify-between rounded-xl bg-surface-default px-4 py-2 text-sm text-fg-secondary">
              Autre date
              <input
                type="date"
                min={auj}
                value={debut !== "lundi" && debut !== "aujourdhui" ? debut : ""}
                onChange={(e) => setDebut(e.target.value || "lundi")}
                className="bg-transparent text-right text-fg-primary outline-none"
              />
            </label>
          </Etape>
        )}

        {etape === 4 && (
          <Etape titre="Ton matériel" sous="Seuls les exercices faisables avec ce que tu as seront proposés.">
            <div className="grid grid-cols-3 gap-2">
              {PRESETS_MATERIEL.map((pr) => {
                const actif = pr.m.length === p.materiel.length && pr.m.every((m) => p.materiel.includes(m));
                return (
                  <button
                    key={pr.l}
                    type="button"
                    onClick={() => maj("materiel", pr.m)}
                    aria-pressed={actif}
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-colors ${actif ? "border-action-primary bg-surface-brand-subtle text-fg-primary" : "border-line-default bg-surface-default text-fg-secondary"}`}
                  >
                    <Icon name={pr.icone} size={24} className="text-fg-brand" />
                    {pr.l}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {materiels.map(([m, n]) => {
                const actif = p.materiel.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => maj("materiel", actif ? p.materiel.filter((x) => x !== m) : [...p.materiel, m])}
                    aria-pressed={actif}
                    className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${actif ? "bg-action-primary text-fg-on-brand" : "bg-surface-default text-fg-secondary"}`}
                  >
                    {actif && <Icon name="check" size={16} />}
                    {LIBELLES.materiel[m] ?? m}
                    <span className={`text-xs ${actif ? "text-fg-on-brand/70" : "text-fg-tertiary"}`}>{n}</span>
                  </button>
                );
              })}
            </div>
          </Etape>
        )}

        {etape === 5 && (
          <Etape titre="Ton programme" sous="Voilà ce que l’agent va construire.">
            <section className="relative overflow-hidden rounded-2xl border border-line-default bg-surface-default p-5">
              <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-action-primary/35 blur-3xl" aria-hidden />
              <div className="relative">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-brand">{LIBELLES.niveau[p.niveau]}</p>
                <p className="text-3xl font-semibold tracking-tight">{LIBELLES.objectif[p.objectif]}</p>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Stat valeur={p.semaines} label="semaines" />
                  <Stat valeur={plan.nb_salle + plan.nb_boxe} label="séances / sem." />
                  <Stat valeur={p.duree_min} label="min" />
                </div>
                <div className="mt-5 flex items-end gap-0.5" aria-label="Frise des phases">
                  {phases.map((ph) => (
                    <span key={ph.semaine} className={`flex-1 rounded-sm ${TEINTE[ph.focus]} ${ph.focus === "deload" ? "h-3" : "h-6"}`} />
                  ))}
                </div>
                <div className="mt-2 flex text-[10px] text-fg-tertiary">
                  {Array.from({ length: Math.ceil(p.semaines / 4) }, (_, i) => (
                    <span key={i} className="flex-1 truncate">
                      Bloc {i + 1} · {LIBELLES.focus[phases[i * 4]?.focus] ?? ""}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <p className="mt-5 text-sm font-semibold">Semaine type</p>
            <ul className="mt-2 space-y-1.5">
              {JOURS.map((j) => {
                const ss = plan.jours[j.v];
                return (
                  <li key={j.v} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${ss.length ? "bg-surface-default" : ""}`}>
                    <span className="w-9 text-xs font-medium text-fg-tertiary">{j.l.slice(0, 3)}.</span>
                    {ss.length === 0 ? (
                      <span className="text-sm text-fg-tertiary">Repos</span>
                    ) : (
                      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        {ss.map((s) => (
                          <span key={s.genre} className="flex items-center gap-1 text-sm font-medium">
                            <Icon
                              name={s.genre === "boxe" ? "sports_mma" : "fitness_center"}
                              size={16}
                              className={s.genre === "boxe" ? "text-fg-accent" : "text-fg-brand"}
                            />
                            {s.genre === "boxe" ? "Boxe" : s.titre}
                          </span>
                        ))}
                      </span>
                    )}
                    {ss.length > 1 && (
                      <span className="ml-auto rounded-full bg-surface-brand-subtle px-2 py-0.5 text-[10px] font-semibold text-fg-brand">Double</span>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="mt-4 text-xs text-fg-tertiary">
              Calories estimées avec {poids.valeur} kg (
              {poids.source === "pesee" ? "dernière pesée" : poids.source === "reglages" ? "réglage" : "valeur par défaut"}).
              {programme ? " Le programme actuel sera remplacé : ses séances à venir non faites sont supprimées, ton historique reste." : ""}
            </p>
            {plan.avertissements.length > 0 && <p className="mt-2 text-xs text-feedback-danger-text">{plan.avertissements.join(" ")}</p>}
            {erreur && <p className="mt-3 rounded-md bg-feedback-danger/10 px-4 py-3 text-sm text-feedback-danger-text">Échec : {erreur}</p>}
          </Etape>
        )}
      </main>

      {/* Pied : continuer / générer */}
      <footer className="fixed inset-x-0 bottom-0 z-[60] bg-gradient-to-t from-surface-canvas via-surface-canvas to-transparent pb-safe pt-6">
        <div className="mx-auto max-w-lg px-4 pb-4">
          {etape < ETAPES.length - 1 ? (
            <button
              type="button"
              onClick={() => setEtape((e) => e + 1)}
              disabled={!peutContinuer}
              className="tap flex w-full items-center justify-center gap-2 rounded-full bg-action-primary text-base font-semibold text-fg-on-brand transition-opacity disabled:opacity-40"
            >
              Continuer <Icon name="arrow_forward" size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={generer}
              disabled={plan.nb_salle + plan.nb_boxe === 0}
              className="tap flex w-full items-center justify-center gap-2 rounded-full bg-action-primary text-base font-semibold text-fg-on-brand shadow-lg shadow-action-primary/30 disabled:opacity-40"
            >
              <Icon name="bolt" size={22} filled /> {programme ? "Générer mon nouveau programme" : "Générer mon programme"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

function Etape({ titre, sous, children }: { titre: string; sous?: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-3xl font-semibold leading-tight tracking-tight">{titre}</h1>
      {sous && <p className="mt-2 text-sm text-fg-secondary">{sous}</p>}
      <div className="mt-6">{children}</div>
    </>
  );
}

function GrandChoix({ actif, onClick, children }: { actif: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all active:scale-[0.99] ${actif ? "border-action-primary bg-surface-brand-subtle shadow-lg shadow-action-primary/10" : "border-line-default bg-surface-default"}`}
    >
      {children}
      <Icon
        name={actif ? "check_circle" : "radio_button_unchecked"}
        size={22}
        filled={actif}
        className={`shrink-0 ${actif ? "text-fg-brand" : "text-fg-tertiary"}`}
      />
    </button>
  );
}

function Pastille({ actif, icone, label, onClick, boxe }: { actif: boolean; icone: string; label: string; onClick: () => void; boxe?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={actif}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${actif ? (boxe ? "bg-surface-accent text-fg-on-brand" : "bg-action-primary text-fg-on-brand") : "bg-surface-sunken text-fg-tertiary"}`}
    >
      <Icon name={icone} size={20} filled={actif} />
    </button>
  );
}

function Stat({ valeur, label }: { valeur: number; label: string }) {
  return (
    <div className="rounded-xl bg-surface-sunken/60 px-2 py-2.5 text-center">
      <p className="text-2xl font-semibold leading-none tracking-tight tabular-nums">{valeur}</p>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-fg-tertiary">{label}</p>
    </div>
  );
}

function EcranGeneration({ message, progression }: { message: string; progression: number }) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-surface-canvas px-8 text-center" role="status" aria-live="polite">
      <div className="relative h-40 w-40">
        <span className="absolute inset-0 animate-ping rounded-full bg-action-primary/20" />
        <span className="absolute inset-4 rounded-full bg-action-primary/25 blur-xl" />
        <span className="absolute inset-6 flex items-center justify-center rounded-full bg-action-primary text-fg-on-brand shadow-2xl shadow-action-primary/50">
          <Icon name="bolt" size={56} filled />
        </span>
      </div>
      <p className="mt-10 text-2xl font-semibold tracking-tight">On construit ton programme</p>
      <p key={message} className="assistant-etape mt-2 h-5 text-sm text-fg-secondary">
        {message}
      </p>
      <div className="mt-6 h-1 w-48 overflow-hidden rounded-full bg-surface-sunken">
        <div className="h-full bg-action-primary transition-all duration-700" style={{ width: `${progression * 100}%` }} />
      </div>
    </div>
  );
}

function EcranFini({ r, objectif }: { r: Resultat; objectif: string }) {
  const date = (j: string) => new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="assistant-etape mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 pb-safe pt-safe">
      <div className="relative">
        <div className="absolute -left-10 -top-16 h-56 w-56 rounded-full bg-action-primary/30 blur-3xl" aria-hidden />
        <Icon name="verified" size={56} filled className="relative text-fg-brand" />
      </div>
      <p className="mt-6 text-[10px] font-semibold uppercase tracking-widest text-fg-brand">C’est prêt</p>
      <h1 className="text-4xl font-semibold leading-tight tracking-tight">{LIBELLES.objectif[objectif] ?? "Programme"}</h1>
      <p className="mt-2 text-fg-secondary">
        Premier jour : {date(r.debut)}. Dernier : {date(r.fin)}.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3">
        <Stat valeur={r.nb_seances} label="séances" />
        <Stat valeur={r.nb_exercices} label="exercices" />
      </div>
      {r.avertissements.length > 0 && <p className="mt-4 text-xs text-fg-tertiary">{r.avertissements.join(" ")}</p>}
      <div className="mt-10 grid gap-2">
        <Link href="/sport/programme" className="tap flex items-center justify-center gap-2 rounded-full bg-action-primary font-semibold text-fg-on-brand">
          Découvrir mon programme <Icon name="arrow_forward" size={20} />
        </Link>
        <Link href={`/sport?jour=${r.debut}`} className="tap flex items-center justify-center rounded-full bg-surface-default font-medium">
          Voir la première séance
        </Link>
      </div>
    </div>
  );
}
