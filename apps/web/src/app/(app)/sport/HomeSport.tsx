import Link from "next/link";
import type { bilanJour, ParametresSport, TableauSport } from "@kvalia/core";
import { IconeDs } from "@/components/kv/IconeDs";
import type { MarqueJour } from "@/components/BandeJours";
import { MenuApps } from "@/components/MenuApps";
import "./home.css";
import { JoursHome, type PastilleJour } from "./JoursHome";
import { decaler, kcalPrevues, libelleFocus, libellePartie, libelleType, nomAffiche, positionProgramme, type Programme, type SeanceComplete } from "./lib";

/** Nombre à la française ; espace insécable classique (l'espace fine U+202F n'existe pas dans Geist). */
const nb = (n: number, d = 0) => n.toLocaleString("fr-FR", { maximumFractionDigits: d, minimumFractionDigits: d }).replace(/\u202f/g, "\u00a0");
const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const ETAPES_ONBOARDING = 13;

export type HomeSportProps = {
  jour: string;
  auj: string;
  seances: SeanceComplete[];
  params: ParametresSport;
  programme: Programme | null;
  marques: Record<string, MarqueJour[]>;
  bilan: Awaited<ReturnType<typeof bilanJour>>;
  tableau: TableauSport;
  poids: number;
  prochaine: { jour: string; titre: string | null; type: string } | null;
};

/** Vue de la Home Sport (maquette Figma « 21 · Home Sport · v3 (app) ») : uniquement de l'affichage, données en props. */
export function HomeSport({ jour, auj, seances, params, programme, marques, bilan, tableau, poids, prochaine }: HomeSportProps) {
  const ob = params.onboarding;
  const pos = positionProgramme(programme, jour);
  const dansProgramme = !!pos && !pos.avant && !pos.apres;

  const seance = seances.find((s) => s.etat !== "faite") ?? seances[0] ?? null;
  // En-tête
  const focus = seance?.focus ?? null;
  const surTitre = dansProgramme ? `Sport · bloc ${libelleFocus(focus)?.toLowerCase() ?? pos.bloc} S${pos.semaine}/${pos.total ?? "?"}` : "Sport";
  const titre = capitale(new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }));
  const prog = tableau.progression;

  // Jours : 3 avant → 17 après le jour choisi
  const pastilles: PastilleJour[] = Array.from({ length: 21 }, (_, i) => decaler(jour, i - 3)).map((j) => {
    const d = new Date(`${j}T12:00:00`);
    const m = marques[j] ?? [];
    return {
      jour: j,
      lettre: j === auj && j === jour ? "AUJ" : d.toLocaleDateString("fr-FR", { weekday: "narrow" }).toUpperCase(),
      numero: d.getDate(),
      etat: j === jour ? "on" : j === auj ? "auj" : j < auj ? "passe" : "defaut",
      points: m.filter((x) => x.type !== "repos").map((x, i) => (x.etat === "faite" ? "fait" : i > 0 ? "alt" : "prevu")),
      label: `${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${m.length ? ` · ${m.length} séance${m.length > 1 ? "s" : ""}` : ""}`,
    };
  });

  // Séance du jour
  const exos = seance?.exercices_seance ?? [];
  const lieu = params.profil?.lieu === "maison" ? "Maison" : "Salle";
  const parties = [...new Set(exos.map((e) => libellePartie(e.exercices_ref?.partie_corps ?? null)).filter(Boolean))].slice(0, 3);
  const sousTitreSeance = [lieu, ...parties.map((p, i) => (i === 0 ? p : p.toLowerCase()))].join(" · ");
  const kcalSeance = seance ? (seance.etat === "faite" ? Number(seance.kcal ?? 0) : kcalPrevues(seance, poids)) : 0;
  const faite = seance?.etat === "faite";
  const enCours = seance?.etat === "en_cours";
  const rang = tableau.rang && seance && tableau.rang.seance_id === seance.id ? `${tableau.rang.rang}/${tableau.rang.total}` : null;
  const cta = faite ? "Voir le résumé" : enCours ? "Reprendre la séance" : jour === auj ? "Démarrer la séance" : "Voir la séance";

  // Énergie
  const restantes = seances.filter((s) => s.etat !== "faite" && s.type !== "repos").reduce((a, s) => a + kcalPrevues(s, poids), 0);
  const bruleCible = bilan.brule + restantes;
  const pMange = bilan.cible > 0 ? Math.min(1, bilan.consomme / bilan.cible) : 0;
  const pBrule = bruleCible > 0 ? Math.min(1, bilan.brule / bruleCible) : 0;

  // Corps
  const pProt = bilan.proteines_cible > 0 ? Math.min(1, bilan.proteines / bilan.proteines_cible) : 0;
  const vol = tableau.semaine.tonnage_kg / 1000;
  const pVol = tableau.semaine.tonnage_precedente_kg > 0 ? Math.min(1, tableau.semaine.tonnage_kg / tableau.semaine.tonnage_precedente_kg) : vol > 0 ? 1 : 0;
  const courbePoids = courbe(tableau.poids.serie, 86, 4);

  // Objectif de la semaine
  const sem = tableau.semaine;
  const prevuesTexte = `${sem.prevues} séance${sem.prevues > 1 ? "s" : ""} de salle`;
  const totalSemaines = pos?.total ?? null;

  return (
    <div data-module="sport" className="kv-ground relative min-h-dvh overflow-clip bg-surface-page text-fg-primary">
      <main className="kv-ground-content hs mx-auto max-w-lg">
        {/* En-tête */}
        <header className="hs-header">
          <MenuApps ds />
          <div className="hs-header-titre">
            <p className="type-overline truncate text-fg-brand">{surTitre}</p>
            <h1 className="type-display-lg truncate">{titre}</h1>
          </div>
          <Link
            href="/sport/historique"
            className="hs-niveau"
            aria-label={`Niveau ${prog.niveau}, ${prog.nom} : ${prog.xp_restant} XP avant le niveau ${prog.prochain}`}
          >
            <span className="hs-niveau-chip">
              <span className="hs-niveau-num hs-mono-caps">{prog.niveau}</span>
              <span className="type-label-md">{prog.nom}</span>
            </span>
            <span className="hs-mono-caps text-fg-tertiary">
              {nb(prog.xp_restant)} XP → niv. {prog.prochain}
            </span>
          </Link>
        </header>

        <JoursHome pastilles={pastilles} />

        {/* Onboarding passé (« Plus tard ») : reprise */}
        {!programme && ob?.passe && !ob.termine && (
          <section className="hs-section">
            <Link href="/sport/bienvenue?reprendre=1" data-module="sport" data-theme="dark" className="hs-ticket">
              <span className="hs-ticket-decor" aria-hidden />
              <div className="flex items-baseline justify-between">
                <span className="type-display-xl">
                  {String(Math.max(0, (ob.etape ?? 1) - 1)).padStart(2, "0")}/{ETAPES_ONBOARDING}
                </span>
                <span className="type-mono-sm text-fg-tertiary">≈ {Math.max(1, Math.round((ETAPES_ONBOARDING - (ob.etape ?? 1) + 1) * 0.2))} min</span>
              </div>
              <div className="flex flex-col gap-[var(--stack-xs)]">
                <p className="type-title-lg">Ton plan attend ta réponse.</p>
                <p className="type-body-md text-fg-secondary">Sans profil, pas de séances ni de charges. On reprend là où tu t’es arrêté.</p>
              </div>
              <span className="hs-cta">
                <span className="hs-btn-xl">Reprendre</span>
                <span className="hs-cta-fin">
                  <IconeDs nom="arrow-right" />
                </span>
              </span>
            </Link>
          </section>
        )}

        {/* Séance du jour */}
        {seance && seance.type !== "repos" && (
          <section className="hs-section" aria-label="Séance du jour">
            <Link href={`/sport/seance/${seance.id}`} data-module="sport" data-theme="dark" className="hs-ticket">
              <span className="hs-ticket-decor" aria-hidden />
              <div className="flex items-center justify-between">
                <span className="kv-tag kv-tag-brand">
                  {jour === auj ? "Aujourd’hui" : capitale(new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" }))}
                </span>
                {dansProgramme && (
                  <span className="type-mono-sm text-fg-tertiary">
                    S{pos.semaine}
                    {rang ? ` · ${rang}` : ""}
                  </span>
                )}
              </div>
              <div className="flex flex-col gap-[var(--stack-xs)]">
                <h2 className="type-display-xl">{seance.titre ?? libelleType(seance.type)}</h2>
                <p className="type-body-md truncate text-fg-secondary">{sousTitreSeance}</p>
              </div>
              <div className="hs-perf-dash" aria-hidden />
              <dl className="hs-chiffres">
                {[
                  ["Durée", `${seance.duree_min ?? params.duree_min} min`],
                  ["Exercices", enCours || faite ? `${exos.filter((e) => e.fait).length}/${exos.length}` : String(exos.length)],
                  [faite ? "Brûlées" : "Estimé", `≈ ${nb(kcalSeance)} kcal`],
                ].map(([k, v]) => (
                  <div key={k} className="hs-chiffre">
                    <dt className="type-mono-xs text-fg-tertiary">{k}</dt>
                    <dd className="type-label-lg">{v}</dd>
                  </div>
                ))}
              </dl>
              <span className={`hs-cta ${faite ? "is-calme" : ""}`}>
                <span className="hs-btn-xl">{cta}</span>
                <span className="hs-cta-fin">
                  <IconeDs nom={faite ? "check" : "arrow-right"} />
                </span>
              </span>
            </Link>
          </section>
        )}

        {/* Jour de repos (maquette « 18 · Home · jour de repos ») */}
        {programme && (!seance || seance.type === "repos") && (
          <section className="hs-section">
            <div className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-lg)] shadow-card">
              <span className="kv-tag kv-tag-neutral self-start">Repos</span>
              <p className="type-title-lg">Récupération active</p>
              <p className="type-body-sm text-fg-secondary">Marche, mobilité, sommeil. Les muscles se construisent aujourd’hui.</p>
              {prochaine && (
                <Link
                  href={`/sport?jour=${prochaine.jour}`}
                  className="flex min-h-[var(--control-min)] items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-sm)] type-body-sm"
                >
                  <span className="truncate">
                    Prochaine : {prochaine.titre ?? libelleType(prochaine.type)} ·{" "}
                    {new Date(`${prochaine.jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                  </span>
                  <IconeDs nom="chevron-right" taille={18} className="shrink-0 text-icon-tertiary" />
                </Link>
              )}
            </div>
          </section>
        )}

        {/* Objectif de la semaine (remplace le « Défi » de la maquette d'origine) */}
        {sem.prevues > 0 && (
          <section className="hs-section">
            <div className="hs-objectif">
              <div className="flex items-start justify-between gap-[var(--inline-md)]">
                <div className="flex min-w-0 flex-col gap-[var(--stack-xs)]">
                  <p className="type-overline">Objectif de la semaine</p>
                  <p className="type-title-lg">
                    {prevuesTexte}
                    <br />
                    d’ici dimanche
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end">
                  <span className="type-numeric-lg">
                    {sem.faites}/{sem.prevues}
                  </span>
                  <span className="type-mono-xs">{sem.xp_a_gagner > 0 ? `+${nb(sem.xp_a_gagner)} XP` : "Bouclée"}</span>
                </div>
              </div>
              <div
                className="hs-segments"
                style={{ gridTemplateColumns: `repeat(${sem.prevues}, minmax(0, 1fr))` }}
                role="img"
                aria-label={`${sem.faites} séances faites sur ${sem.prevues}`}
              >
                {Array.from({ length: sem.prevues }, (_, i) => (
                  <span key={i} className={`hs-segment ${i >= sem.faites ? "is-reste" : ""}`} />
                ))}
              </div>
              <div className="flex justify-between gap-[var(--inline-md)] type-mono-sm">
                <span>
                  {tableau.serie_semaines > 0
                    ? `Série · ${tableau.serie_semaines} semaine${tableau.serie_semaines > 1 ? "s" : ""} complète${tableau.serie_semaines > 1 ? "s" : ""}`
                    : "Série · à lancer cette semaine"}
                </span>
                <span>
                  {nb(prog.xp_restant)} XP → niv. {prog.prochain}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Énergie */}
        <section className="hs-section">
          <div data-module="sport" data-theme="dark" className="hs-energie">
            <div className="flex items-center justify-between">
              <p className="type-overline text-fg-tertiary">
                Énergie · {jour === auj ? "aujourd’hui" : new Date(`${jour}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long" })}
              </p>
              <Link href={`/nutrition?jour=${jour}`} className="hs-control flex items-center gap-[var(--stack-2xs)] text-fg-brand">
                Nutrition <IconeDs nom="chevron-right" taille={16} />
              </Link>
            </div>
            <div
              className="hs-jauge"
              role="img"
              aria-label={`${nb(bilan.consomme)} kcal mangées sur ${nb(bilan.cible)} ; ${nb(bilan.brule)} kcal brûlées sur ${nb(bruleCible)}`}
            >
              <svg width="260" height="140" viewBox="0 0 260 140" fill="none" aria-hidden>
                <path d="M20 130A110 110 0 0 1 240 130" stroke="var(--data-track)" strokeWidth="14" strokeLinecap="round" />
                {pMange > 0 && (
                  <path
                    d="M20 130A110 110 0 0 1 240 130"
                    stroke="var(--icon-primary)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${pMange} 1`}
                  />
                )}
                <path d="M44 130A86 86 0 0 1 216 130" stroke="var(--data-track)" strokeWidth="8" strokeLinecap="round" />
                {pBrule > 0 && (
                  <path
                    d="M44 130A86 86 0 0 1 216 130"
                    stroke="var(--icon-action)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={`${pBrule} 1`}
                  />
                )}
              </svg>
              <div className="hs-jauge-centre">
                <span className="type-display-md">{nb(Math.abs(bilan.reste))}</span>
                <span className="type-mono-xs text-fg-secondary">{bilan.reste >= 0 ? "kcal restantes" : "kcal en trop"}</span>
              </div>
            </div>
            <dl className="hs-chiffres">
              <div className="hs-chiffre">
                <dt className="flex items-center gap-[var(--inline-xs)] type-mono-xs text-fg-secondary">
                  <span className="hs-pastille bg-surface-container-inverse" /> Mangées
                </dt>
                <dd className="type-label-lg">
                  {nb(bilan.consomme)} / {nb(bilan.cible)}
                </dd>
              </div>
              <div className="hs-chiffre">
                <dt className="flex items-center gap-[var(--inline-xs)] type-mono-xs text-fg-secondary">
                  <span className="hs-pastille bg-surface-container-brand" /> Brûlées
                </dt>
                <dd className="type-label-lg">
                  {nb(bilan.brule)} / {nb(bruleCible)}
                </dd>
              </div>
              <div className="hs-chiffre">
                <dt className="type-mono-xs text-fg-secondary">Séance</dt>
                <dd className="type-label-lg">{restantes > 0 ? `≈ +${nb(restantes)}` : bilan.brule > 0 ? `+${nb(bilan.brule)}` : "—"}</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Corps */}
        <section className="hs-section">
          <div className="hs-corps">
            <div>
              <span className="type-mono-xs text-fg-tertiary">Protéines</span>
              <span className="type-numeric-md">{nb(bilan.proteines)} g</span>
              <span className="hs-piste" aria-hidden>
                <span style={{ width: `${pProt * 100}%` }} />
              </span>
            </div>
            <div>
              <span className="type-mono-xs text-fg-tertiary">Poids</span>
              <span className="flex h-[26px] items-baseline text-fg-primary">
                <span className="type-numeric-md">{tableau.poids.actuel ? nb(tableau.poids.actuel, 1) : "—"}</span>
                <span className="hs-mono-caps">&nbsp;kg</span>
              </span>
              <svg width="100%" height="8" viewBox="0 -2 86 8" preserveAspectRatio="none" fill="none" aria-hidden>
                {courbePoids && (
                  <polyline
                    points={courbePoids}
                    stroke="var(--icon-primary)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )}
              </svg>
            </div>
            <div>
              <span className="type-mono-xs text-fg-tertiary">Volume sem.</span>
              <span className="flex h-[26px] items-baseline text-fg-primary">
                <span className="type-numeric-md">{nb(vol, 1)}</span>
                <span className="hs-mono-caps">&nbsp;t</span>
              </span>
              <span className="hs-piste" aria-hidden>
                <span style={{ width: `${pVol * 100}%` }} />
              </span>
            </div>
          </div>
        </section>

        {/* Records */}
        {tableau.records.length > 0 && (
          <section className="hs-section flex flex-col gap-[var(--stack-sm)]">
            <div className="flex items-baseline justify-between px-[var(--inset-xs)]">
              <h2 className="type-title-lg">Records</h2>
              <span className="type-mono-sm text-fg-tertiary">
                {[focus ? `bloc ${libelleFocus(focus)?.toLowerCase()}` : null, totalSemaines ? `${totalSemaines} sem.` : null].filter(Boolean).join(" · ")}
              </span>
            </div>
            <div className="hs-records">
              {tableau.records.map((r) => {
                const pts = courbe(r.serie, 70, 24);
                return (
                  <Link key={r.exercice_id} href={`/sport/exercices/${r.exercice_id}`} className="hs-record">
                    <span className="flex min-w-0 flex-1 flex-col gap-[var(--stack-2xs)]">
                      <span className="type-label-lg truncate">{nomAffiche({ nom: r.nom, nom_fr: r.nom_fr })}</span>
                      <span className={`hs-mono-strong ${r.progression_kg > 0 ? "text-feedback-success-text" : "text-fg-tertiary"}`}>
                        {r.progression_kg > 0 ? `+${nb(r.progression_kg, r.progression_kg % 1 ? 1 : 0)} kg` : "stable"} / {r.semaines} sem.
                      </span>
                    </span>
                    <svg width="72" height="28" viewBox="-1 -2 72 28" fill="none" aria-hidden>
                      {pts && <polyline points={pts} stroke="var(--data-series-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
                    </svg>
                    <span className="flex w-[76px] items-baseline justify-end gap-[var(--stack-2xs)]">
                      <span className="type-numeric-md">{nb(r.charge_kg, r.charge_kg % 1 ? 1 : 0)}</span>
                      <span className="hs-mono-caps text-fg-tertiary">kg</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Coach */}
        <section className="hs-coach">
          <span className="pt-[var(--stack-xs)] text-icon-action">
            <IconeDs nom="agent" taille={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-[var(--inline-sm)]">
            <p className="type-body-lg">« {tableau.coach.message} »</p>
            <p className="type-mono-sm text-fg-tertiary">{tableau.coach.detail}</p>
          </div>
        </section>
      </main>
    </div>
  );
}

/** Points d'une courbe (polyline) dans une boîte l × h : min en bas, max en haut. `null` sans données. */
function courbe(valeurs: number[], l: number, h: number): string | null {
  if (valeurs.length === 0) return null;
  const v = valeurs.length === 1 ? [valeurs[0], valeurs[0]] : valeurs;
  const min = Math.min(...v);
  const max = Math.max(...v);
  return v
    .map((x, i) => `${Math.round((i / (v.length - 1)) * l * 10) / 10},${max === min ? h / 2 : Math.round((h - ((x - min) / (max - min)) * h) * 10) / 10}`)
    .join(" ");
}
