"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { LIBELLES, parametresDepuisReponses, phasesProgramme, planSemaine, type ParametresSport, type ReponsesProgramme } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { WheelPicker } from "@/components/kv/WheelPicker";
import { creerProgramme } from "../../actions";
import { libelleFocus } from "../../lib";
import { TEINTE_PHASE } from "../Phases";

type Objectif = ReponsesProgramme["objectif"];
const OBJECTIFS: Array<{ id: Objectif; t: string; d: string }> = [
  { id: "force", t: "Force", d: "Soulever plus lourd sur les gros mouvements" },
  { id: "masse", t: "Prise de muscle", d: "Plus de volume, silhouette" },
  { id: "seche", t: "Sèche", d: "Perdre du gras en gardant le muscle" },
  { id: "explosivite", t: "Explosivité", d: "Vitesse, puissance, gainage" },
  { id: "endurance", t: "Endurance", d: "Tenir l’effort plus longtemps" },
  { id: "sante", t: "Remise en forme", d: "Bouger régulièrement, sans pression" },
];
const JOURS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];
const LETTRE = ["D", "L", "M", "M", "J", "V", "S"];
const DUREES = [45, 60, 75, 90];
const ETAPES_GENERATION = ["Analyse de ton objectif", "Répartition de la semaine", "Choix des exercices", "Calcul des charges", "Projection et phases"];

type Props = {
  mode: "nouveau" | "modifier";
  initiales: ReponsesProgramme;
  /** Paramètres actuels : le profil (niveau, matériel…) n'est pas redemandé ici. */
  base: ParametresSport;
  aujourdhui: string;
  lundiProchain: string;
  /** Un programme est actif : il sera remplacé à partir du premier jour choisi. */
  remplace: boolean;
};

/**
 * Parcours « Nouveau programme » / « Modifier le programme » (maquettes 03 → 05, 09, 08, 13), sans les questions
 * de profil (niveau, lieu, douleurs, repères : déjà connus). Objectif → échéance → rythme et premier jour →
 * proposition (phases et semaine type calculées par le noyau) → génération → « C'est parti ».
 */
export function Parcours({ mode, initiales, base, aujourdhui, lundiProchain, remplace }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [etape, setEtape] = useState(0);
  const [r, setR] = useState<ReponsesProgramme>(initiales);
  const [echeance, setEcheance] = useState(true);
  const [debut, setDebut] = useState<string>(mode === "modifier" ? aujourdhui : lundiProchain);
  const [ecran, setEcran] = useState<"questions" | "generation" | "pret">("questions");
  const [gen, setGen] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<Awaited<ReturnType<typeof creerProgramme>> | null>(null);

  // Animation de la génération : une ligne cochée toutes les 0,6 s, jusqu'à la réponse du serveur.
  useEffect(() => {
    if (ecran !== "generation") return;
    const id = setInterval(() => setGen((g) => Math.min(ETAPES_GENERATION.length, g + 1)), 600);
    return () => clearInterval(id);
  }, [ecran]);

  const params = parametresDepuisReponses(base, { ...r, semaines: echeance ? r.semaines : 12 });
  const plan = planSemaine(params);
  const phases = phasesProgramme(params);
  const finIso = (() => {
    const d = new Date(debut + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + params.semaines * 7 - 1);
    return d.toISOString().slice(0, 10);
  })();
  const date = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", o);
  const titreObjectif = OBJECTIFS.find((o) => o.id === r.objectif)?.t ?? LIBELLES.objectif[params.objectif];
  const total = 4; // 3 questions + proposition
  const vue = ecran === "generation" && resultat && gen >= ETAPES_GENERATION.length ? "pret" : ecran;

  function maj<K extends keyof ReponsesProgramme>(k: K, v: ReponsesProgramme[K]) {
    setR((x) => ({ ...x, [k]: v }));
  }

  function valider() {
    setErreur(null);
    setGen(0);
    setEcran("generation");
    start(async () => {
      try {
        setResultat(await creerProgramme({ ...r, semaines: echeance ? r.semaines : 12 }, debut));
      } catch (e) {
        setEcran("questions");
        setErreur(e instanceof Error ? e.message : "La génération a échoué.");
      }
    });
  }

  const pied = (contenu: React.ReactNode) => (
    // Barre d'action au-dessus de l'indicateur d'accueil iPhone.
    <div className="sticky bottom-0 bg-surface-page/85 pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))] pt-[var(--stack-md)] backdrop-blur-md">
      {contenu}
    </div>
  );

  return (
    <div data-module="sport" className="kv-ground min-h-dvh bg-surface-page text-fg-primary">
      <div className="kv-ground-content mx-auto flex min-h-dvh max-w-lg flex-col px-[var(--page-gutter-wide)] pt-safe">
        {vue === "questions" && (
          <>
            {/* En-tête : fermer / précédent, progression — sous la barre d'état. */}
            <div className="flex items-center gap-[var(--inline-lg)] pt-[var(--stack-sm)]">
              {etape === 0 ? (
                <Link href="/sport/programme" className="kv-iconbtn kv-iconbtn-glass" aria-label="Fermer">
                  <Icon name="close" size={24} />
                </Link>
              ) : (
                <button type="button" onClick={() => setEtape((e) => e - 1)} className="kv-iconbtn kv-iconbtn-glass" aria-label="Étape précédente">
                  <Icon name="chevron_left" size={24} />
                </button>
              )}
              <div className="flex flex-1 gap-[var(--inline-xs)]" aria-hidden>
                {Array.from({ length: total }, (_, i) => (
                  <span key={i} className={`h-1 flex-1 rounded-full ${i <= etape ? "bg-fg-primary" : "bg-data-track"}`} />
                ))}
              </div>
              <span className="kv-mono" aria-live="polite">
                {etape + 1} / {total}
              </span>
            </div>

            <div key={etape} className="assistant-etape flex flex-1 flex-col gap-[var(--stack-lg)] pt-[var(--stack-xl)]">
              {erreur && (
                <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
              )}

              {etape === 0 && (
                <>
                  <Titre
                    sur={mode === "modifier" ? "Modifier · objectif" : "Objectif"}
                    titre="Qu’est-ce que tu veux atteindre ?"
                    aide="Ça définit le type de séances, de répétitions et de progression."
                  />
                  <div className="flex flex-col gap-[var(--stack-sm)]" role="radiogroup" aria-label="Objectif">
                    {OBJECTIFS.map((o) => (
                      <Option key={o.id} titre={o.t} description={o.d} actif={r.objectif === o.id} onClick={() => maj("objectif", o.id)} />
                    ))}
                  </div>
                </>
              )}

              {etape === 1 && (
                <>
                  <Titre sur="Échéance" titre="Tu as une date en tête ?" aide="Avec une échéance, l’IA découpe le programme en phases jusqu’au jour J." />
                  <div className="flex flex-col gap-[var(--stack-sm)]" role="radiogroup" aria-label="Échéance">
                    <Option titre="Oui, une échéance" description="Test de force, vacances, événement…" actif={echeance} onClick={() => setEcheance(true)} />
                    <Option
                      titre="Non, à mon rythme"
                      description="Cycles de 12 semaines, renouvelés ensuite"
                      actif={!echeance}
                      onClick={() => setEcheance(false)}
                    />
                  </div>
                  {echeance && (
                    <>
                      <WheelPicker label="Dans combien de semaines ?" unite="sem." valeur={r.semaines} onChange={(v) => maj("semaines", v)} min={4} max={24} />
                      <p className="kv-mono">
                        → objectif le {date(finIso, { day: "numeric", month: "short", year: "numeric" })} · {Math.round(r.semaines / 4.3)} mois environ
                      </p>
                    </>
                  )}
                </>
              )}

              {etape === 2 && (
                <>
                  <Titre
                    sur="Rythme"
                    titre="Combien de temps tu peux y consacrer ?"
                    aide="Choisis tes jours de salle, l’IA place la récupération entre les deux."
                  />
                  <div className="flex flex-col gap-[var(--stack-sm)]">
                    <h2 className="type-title-sm">Quels jours pour la salle ?</h2>
                    <div className="grid grid-cols-7 gap-[var(--inline-xs)]">
                      {JOURS.map((j) => {
                        const on = r.jours.includes(j.v);
                        return (
                          <button
                            key={j.v}
                            type="button"
                            aria-pressed={on}
                            aria-label={`${["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"][j.v]} : ${on ? "salle" : "repos"}`}
                            onClick={() => maj("jours", on ? r.jours.filter((x) => x !== j.v) : r.jours.length >= 6 ? r.jours : [...r.jours, j.v])}
                            className={`flex h-14 flex-col items-center justify-center rounded-[var(--radius-input)] border ${on ? "border-transparent bg-surface-container-inverse text-fg-inverse" : "border-line-default bg-surface-container-default text-fg-primary"}`}
                          >
                            <span className="type-label-lg">{j.l}</span>
                            <span className="font-mono text-[9px] opacity-80">{on ? "salle" : "–"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <p className="kv-mono">
                      {r.jours.length} séance{r.jours.length > 1 ? "s" : ""} de salle par semaine
                    </p>
                  </div>
                  <div className="flex flex-col gap-[var(--stack-sm)]">
                    <h2 className="type-title-sm">Durée d’une séance</h2>
                    <div className="kv-seg" role="radiogroup" aria-label="Durée">
                      {DUREES.map((d) => (
                        <button
                          key={d}
                          type="button"
                          role="radio"
                          aria-checked={r.duree_min === d}
                          onClick={() => maj("duree_min", d)}
                          className={`kv-seg-item ${r.duree_min === d ? "is-on" : ""}`}
                        >
                          {d} min
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-[var(--stack-sm)]">
                    <h2 className="type-title-sm">Premier jour</h2>
                    <div className="kv-seg" role="radiogroup" aria-label="Premier jour">
                      {[
                        [aujourdhui, "Aujourd’hui"],
                        [lundiProchain, `Lundi ${date(lundiProchain, { day: "numeric" })}`],
                      ].map(([v, l]) =>
                        v === lundiProchain && lundiProchain === aujourdhui ? null : (
                          <button
                            key={v}
                            type="button"
                            role="radio"
                            aria-checked={debut === v}
                            onClick={() => setDebut(v)}
                            className={`kv-seg-item ${debut === v ? "is-on" : ""}`}
                          >
                            {l}
                          </button>
                        ),
                      )}
                    </div>
                    {remplace && (
                      <p className="type-body-sm text-fg-secondary">
                        Ton programme actuel s’arrête la veille ; ses séances non faites à partir de ce jour sont remplacées
                        {debut === aujourdhui ? ", celle d’aujourd’hui comprise (sauf si elle est faite)" : ""}.
                      </p>
                    )}
                  </div>
                </>
              )}

              {etape === 3 && (
                <>
                  <div className="flex flex-col gap-[var(--stack-sm)]">
                    <span className="kv-overline text-fg-brand">Proposition · {params.semaines} semaines</span>
                    <h1 className="type-display-lg">{titreObjectif}</h1>
                    <p className="type-body-md text-fg-secondary">
                      {LIBELLES.objectif[params.objectif]} · {plan.nb_salle} salle / sem. · {params.duree_min} min
                    </p>
                    <div className="flex flex-wrap gap-[var(--inline-sm)]">
                      <span className="kv-tag kv-tag-brand">Fin {date(finIso, { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="kv-tag kv-tag-neutral">Début {date(debut, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                  </div>

                  <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
                    <h2 className="kv-overline">Phases</h2>
                    <div className="flex gap-[3px]" aria-hidden>
                      {phases.map((p) => (
                        <span key={p.semaine} className={`h-2.5 flex-1 rounded-full ${TEINTE_PHASE[p.focus] ?? "bg-data-track"}`} />
                      ))}
                    </div>
                    <ul className="grid grid-cols-2 gap-x-[var(--inline-lg)] gap-y-[var(--stack-2xs)]">
                      {[...new Set(phases.map((p) => p.focus))].map((f) => (
                        <li key={f} className="flex items-center gap-[var(--inline-sm)] kv-mono">
                          <span className={`h-2.5 w-2.5 rounded-full ${TEINTE_PHASE[f] ?? "bg-data-track"}`} aria-hidden />
                          {libelleFocus(f)} · {phases.filter((p) => p.focus === f).length} sem.
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="flex flex-col gap-[var(--stack-sm)]">
                    <h2 className="type-title-lg">Semaine type</h2>
                    <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
                      {[1, 2, 3, 4, 5, 6, 0].map((j) => {
                        const ss = plan.jours[j];
                        return (
                          <li
                            key={j}
                            className="flex items-center gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0"
                          >
                            <span
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full type-label-lg ${ss.length ? "bg-surface-container-inverse text-fg-inverse" : "bg-action-tertiary text-fg-secondary"}`}
                            >
                              {LETTRE[j]}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate type-title-sm">{ss.length ? ss.map((x) => x.titre).join(" + ") : "Repos"}</span>
                              <span className="block kv-mono">{ss.length ? `${params.duree_min} min` : "Récupération"}</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section
                    data-theme="dark"
                    data-module="sport"
                    className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] bg-surface-page p-[var(--inset-md)] text-fg-primary shadow-raised"
                  >
                    <p className="flex items-center gap-[var(--inline-sm)] kv-overline text-fg-highlight">
                      <Icon name="auto_awesome" size={16} /> Pourquoi ce programme
                    </p>
                    <p className="type-body-sm">
                      {params.semaines} semaines en blocs de 4 : trois semaines de progression, puis une de décharge pour récupérer.
                      {plan.nb_salle >= 4
                        ? " Le volume est réparti sur un split pour laisser 48 h à chaque muscle."
                        : " Chaque séance travaille tout le corps, pour garder la fréquence."}
                    </p>
                    <p className="type-body-sm">Ton niveau, ton matériel et tes douleurs viennent de ton profil : les exercices en tiennent compte.</p>
                    {plan.avertissements.length > 0 && <p className="type-body-sm text-feedback-warning-text">{plan.avertissements.join(" ")}</p>}
                  </section>
                </>
              )}
            </div>

            {pied(
              etape < 3 ? (
                <button
                  type="button"
                  onClick={() => setEtape((e) => e + 1)}
                  disabled={etape === 2 && r.jours.length === 0}
                  className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block"
                >
                  <span className="kv-btn-label">Continuer</span>
                </button>
              ) : (
                <div className="flex gap-[var(--inline-md)]">
                  <button type="button" onClick={() => setEtape(0)} className="kv-btn kv-btn-outline kv-btn-xl flex-1">
                    Ajuster
                  </button>
                  <button type="button" onClick={valider} className="kv-btn kv-btn-primary kv-btn-xl flex-[1.6]">
                    {mode === "modifier" ? "Mettre à jour" : "Valider"}
                  </button>
                </div>
              ),
            )}
          </>
        )}

        {vue === "generation" && (
          <div className="flex flex-1 flex-col justify-center gap-[var(--stack-xl)] py-[var(--stack-2xl)]" aria-live="polite">
            <span className="kv-overline text-fg-brand">Génération · {Math.round((gen / ETAPES_GENERATION.length) * 100)} %</span>
            <div>
              <h1 className="type-display-lg">L’IA construit ton programme.</h1>
              <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
                {titreObjectif} · {params.semaines} semaines · {plan.nb_salle} séances de salle par semaine
              </p>
            </div>
            <div className="kv-progress-track" aria-hidden>
              <div
                className="kv-progress-fill bg-action-primary transition-[width] duration-[var(--duration-slow)]"
                style={{ width: `${(gen / ETAPES_GENERATION.length) * 100}%` }}
              />
            </div>
            <ol className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
              {ETAPES_GENERATION.map((t, i) => (
                <li
                  key={t}
                  className={`flex items-center gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0 ${i < gen ? "" : "opacity-50"}`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full ${i < gen ? "bg-surface-container-inverse text-fg-inverse" : "border border-line-strong"}`}
                  >
                    {i < gen && <Icon name="check" size={14} />}
                  </span>
                  <span className="type-label-lg">{t}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {vue === "pret" && resultat && (
          <>
            <div className="flex flex-1 flex-col gap-[var(--stack-lg)] pt-[var(--stack-2xl)]">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-surface-container-accent text-fg-primary" aria-hidden>
                <Icon name="check" size={36} />
              </span>
              <div>
                <h1 className="type-display-xl">C’est parti.</h1>
                <p className="mt-[var(--stack-xs)] type-body-lg text-fg-secondary">
                  « {titreObjectif} » est actif. Fin prévue le {date(resultat.fin, { day: "numeric", month: "long", year: "numeric" })}.
                </p>
              </div>
              {resultat.premiere && (
                <Link
                  href={`/sport/seance/${resultat.premiere.id}`}
                  data-module="sport"
                  data-theme="dark"
                  className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised"
                >
                  <div className="kv-ground-content flex flex-col gap-[var(--stack-sm)] p-[var(--inset-lg)]">
                    <div className="flex items-center justify-between">
                      <span className="kv-tag kv-tag-brand">Première séance</span>
                      <span className="kv-mono">{date(resultat.premiere.jour, { weekday: "short", day: "numeric", month: "short" })}</span>
                    </div>
                    <p className="type-display-md">{resultat.premiere.titre}</p>
                    <p className="type-body-md text-fg-secondary">
                      {resultat.premiere.exercices} exercices · {resultat.premiere.duree_min} min · charges calées sur ton historique
                    </p>
                  </div>
                </Link>
              )}
              <p className="type-body-sm text-fg-secondary">
                {resultat.nb_seances} séances au programme. Tu peux le modifier à tout moment depuis l’onglet Programme.
              </p>
            </div>
            {pied(
              <button
                type="button"
                onClick={() => {
                  router.push("/sport/programme");
                  router.refresh();
                }}
                className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block"
              >
                <span className="kv-btn-label">Voir mon programme</span>
              </button>,
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Titre({ sur, titre, aide }: { sur: string; titre: string; aide: string }) {
  return (
    <div className="flex flex-col gap-[var(--stack-sm)]">
      <span className="kv-overline text-fg-brand">{sur}</span>
      <h1 className="type-display-md">{titre}</h1>
      <p className="flex gap-[var(--inline-sm)] type-body-sm text-fg-secondary">
        <Icon name="auto_awesome" size={16} className="shrink-0 text-icon-brand" />
        {aide}
      </p>
    </div>
  );
}

/** Option à choix unique (maquette : carte, titre + aide, pastille radio à droite). */
function Option({ titre, description, actif, onClick }: { titre: string; description: string; actif: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onClick}
      className={`flex w-full items-center gap-[var(--inline-lg)] rounded-[var(--radius-tile)] border bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)] text-left ${actif ? "border-line-strong shadow-card ring-1 ring-fg-primary" : "border-line-subtle"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block type-title-sm">{titre}</span>
        <span className="block type-body-sm text-fg-secondary">{description}</span>
      </span>
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${actif ? "border-fg-primary" : "border-line-strong"}`}
        aria-hidden
      >
        {actif && <span className="h-3 w-3 rounded-full bg-fg-primary" />}
      </span>
    </button>
  );
}
