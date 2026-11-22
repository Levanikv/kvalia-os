"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { DEFIS_SUGGERES, libelleCible, libelleJours, MESURES_DEFI, type EtatDefi, type MesureDefi } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { creerDefiAction, modifierDefiAction, noterDefiAction, supprimerDefiAction } from "./actions";

/**
 * Défis du programme (pas, minutes, répétitions, case à cocher) — règles dans packages/core/src/defis.ts.
 * `DefisDuJour` : la carte de la Home Sport (noter d'un geste : « + 1 000 pas », cocher) ;
 * `DefisProgramme` : la section de l'onglet Programme (ajouter, modifier, mettre en pause, supprimer).
 */

const nf = (n: number) => n.toLocaleString("fr-FR");
/** Toasts au-dessus de la barre de l'app (Home) ou de la barre d'action fixe (Programme). */
const BAS_TOAST_HOME = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--stack-sm))";
const BAS_TOAST_PIED = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--control-xl) + var(--stack-md))";
const dateCourte = (j: string) => new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

/** « 4 000 / 10 000 pas », « Fait » / « À faire » pour une case. */
function progression(d: Pick<EtatDefi, "mesure" | "valeur" | "cible" | "unite">) {
  if (d.mesure === "case") return d.valeur >= d.cible ? "Fait" : "À faire";
  return `${nf(d.valeur)} / ${nf(d.cible)} ${d.unite}`;
}

function TuileIcone({ d, atteint }: { d: Pick<EtatDefi, "icone">; atteint: boolean }) {
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
        atteint ? "bg-feedback-success-subtle text-feedback-success-text" : "bg-surface-container-brand-subtle text-fg-brand"
      }`}
    >
      <Icon name={atteint ? "check" : d.icone} size={20} />
    </span>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Home Sport : défis du jour
// ---------------------------------------------------------------------------------------------------------------

type PropsJour = {
  defis: EtatDefi[];
  jour: string;
  aujourdhui: string;
  /** Faux pour un jour à venir : on regarde, on ne note pas. */
  modifiable: boolean;
};

export function DefisDuJour({ defis, jour, aujourdhui, modifiable }: PropsJour) {
  const router = useRouter();
  const [, start] = useTransition();
  const [valeurs, poser] = useOptimistic(new Map(defis.map((d) => [d.id, d.valeur])), (m: Map<string, number>, maj: { id: string; valeur: number }) =>
    new Map(m).set(maj.id, maj.valeur),
  );
  const [ouvert, setOuvert] = useState<EtatDefi | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const noter = (d: EtatDefi, entree: { valeur?: number; ajouter?: number; fait?: boolean }, prevue: number) => {
    const avant = valeurs.get(d.id) ?? 0;
    start(async () => {
      poser({ id: d.id, valeur: Math.max(0, prevue) });
      const r = await noterDefiAction({ defi_id: d.id, jour, ...entree });
      if (!r.ok) setToast(r.erreur);
      else if (r.valeur.atteint && avant < d.cible) setToast(`Défi « ${d.nom} » tenu.`);
      router.refresh();
    });
  };

  const tenus = defis.filter((d) => (valeurs.get(d.id) ?? 0) >= d.cible).length;

  return (
    <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Défis du jour">
      <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
        <h2 className="type-title-lg">
          Défis du jour{" "}
          <span className="kv-mono">
            {tenus}/{defis.length}
          </span>
        </h2>
        <Link href="/sport/programme#defis" className="type-label-md text-fg-link">
          Gérer
        </Link>
      </div>
      <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
        {defis.map((d) => {
          const v = valeurs.get(d.id) ?? 0;
          const atteint = v >= d.cible;
          const pct = Math.min(100, (v / d.cible) * 100);
          return (
            <li
              key={d.id}
              className="flex items-center gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0"
            >
              <button
                type="button"
                disabled={!modifiable}
                onClick={() => (d.mesure === "case" ? noter(d, { fait: !atteint }, atteint ? 0 : d.cible) : setOuvert(d))}
                className="tap flex min-w-0 flex-1 items-center gap-[var(--inline-lg)] text-left disabled:cursor-default"
                aria-label={d.mesure === "case" ? `${d.nom} : ${atteint ? "décocher" : "cocher"}` : `${d.nom} : noter`}
              >
                <TuileIcone d={d} atteint={atteint} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-title-sm">{d.nom}</span>
                  <span className="flex items-center gap-[var(--inline-sm)] kv-mono">
                    <span className={atteint ? "text-feedback-success-text" : undefined}>{progression({ ...d, valeur: v })}</span>
                    {d.serie > 1 && (
                      <span className="inline-flex items-center gap-0.5" title="Jours tenus d’affilée">
                        <Icon name="local_fire_department" size={14} filled className="text-fg-brand" /> {d.serie} j
                      </span>
                    )}
                  </span>
                  {d.mesure !== "case" && (
                    <span className="kv-progress-track mt-[var(--stack-2xs)] block" aria-hidden>
                      <span className={`kv-progress-fill block ${atteint ? "bg-feedback-success-text" : "bg-action-primary"}`} style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </span>
              </button>
              {modifiable &&
                (d.mesure === "case" ? (
                  <button
                    type="button"
                    onClick={() => noter(d, { fait: !atteint }, atteint ? 0 : d.cible)}
                    aria-pressed={atteint}
                    aria-label={atteint ? `Décocher ${d.nom}` : `Cocher ${d.nom}`}
                    className={`kv-iconbtn shrink-0 ${atteint ? "kv-iconbtn-primary" : "border border-line-strong"}`}
                  >
                    <Icon name="check" size={22} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => noter(d, { ajouter: d.increment }, v + d.increment)}
                    className="kv-btn kv-btn-secondary kv-btn-sm shrink-0 tabular-nums"
                    aria-label={`Ajouter ${nf(d.increment)} ${d.unite} à ${d.nom}`}
                  >
                    + {nf(d.increment)}
                  </button>
                ))}
            </li>
          );
        })}
      </ul>

      {ouvert && (
        <FeuilleNoter
          defi={{ ...ouvert, valeur: valeurs.get(ouvert.id) ?? 0 }}
          libelleJour={jour === aujourdhui ? "Aujourd’hui" : new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
          onFermer={() => setOuvert(null)}
          onNoter={(valeur) => {
            noter(ouvert, { valeur }, valeur);
            setOuvert(null);
          }}
        />
      )}
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST_HOME} />
    </section>
  );
}

/** Saisir la valeur exacte du jour (« j'ai fait 8 500 pas ») ou ajouter par paliers. */
function FeuilleNoter({
  defi,
  libelleJour,
  onFermer,
  onNoter,
}: {
  defi: EtatDefi;
  libelleJour: string;
  onFermer: () => void;
  onNoter: (valeur: number) => void;
}) {
  const [valeur, setValeur] = useState(defi.valeur);
  const paliers = [Math.max(1, Math.round(defi.increment / 2)), defi.increment, defi.increment * 2];
  const atteint = valeur >= defi.cible;
  return (
    <BottomSheet
      ouvert
      onFermer={onFermer}
      titre={defi.nom}
      module="sport"
      pied={
        <div className="flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setValeur(0)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
            Remettre à 0
          </button>
          <button type="button" onClick={() => onNoter(valeur)} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.6]">
            Enregistrer
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-xs)]">
        <label className="flex flex-col items-center gap-[var(--stack-xs)]">
          <span className="kv-overline">
            {libelleJour} · objectif {libelleCible(defi.mesure, defi.cible)}
          </span>
          <span className="flex items-baseline gap-[var(--inline-sm)]">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={Number.isFinite(valeur) ? valeur : 0}
              onChange={(e) => setValeur(Math.max(0, Number(e.target.value) || 0))}
              onFocus={(e) => e.target.select()}
              style={{ width: `${Math.max(2, String(valeur).length) + 0.5}ch` }}
              className="bg-transparent text-right type-display-lg tabular-nums outline-none"
              aria-label={`Valeur du jour (${defi.unite})`}
            />
            <span className="type-title-md text-fg-secondary">{defi.unite}</span>
          </span>
          <span className="kv-progress-track w-full" aria-hidden>
            <span
              className={`kv-progress-fill block ${atteint ? "bg-feedback-success-text" : "bg-action-primary"}`}
              style={{ width: `${Math.min(100, (valeur / defi.cible) * 100)}%` }}
            />
          </span>
          <span className={`kv-mono ${atteint ? "text-feedback-success-text" : ""}`}>
            {atteint ? "Objectif atteint" : `Encore ${nf(defi.cible - valeur)} ${defi.unite}`}
          </span>
        </label>
        <div className="grid grid-cols-4 gap-[var(--inline-sm)]">
          {paliers.map((p) => (
            <button key={p} type="button" onClick={() => setValeur((v) => v + p)} className="kv-chip justify-center tabular-nums">
              + {nf(p)}
            </button>
          ))}
          <button type="button" onClick={() => setValeur((v) => Math.max(v, defi.cible))} className="kv-chip justify-center">
            Cible
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Onglet Programme : la liste des défis et l'éditeur
// ---------------------------------------------------------------------------------------------------------------

type PropsProgramme = {
  defis: EtatDefi[];
  /** Fin du programme actif : un nouveau défi s'arrête avec lui par défaut. */
  finProgramme: string | null;
};

export function DefisProgramme({ defis, finProgramme }: PropsProgramme) {
  const [edite, setEdite] = useState<EtatDefi | "nouveau" | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  return (
    <section id="defis" className="flex scroll-mt-28 flex-col gap-[var(--stack-sm)]">
      <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
        <h2 className="type-title-lg">Défis</h2>
        <button type="button" onClick={() => setEdite("nouveau")} className="tap flex items-center gap-[var(--inline-xs)] type-label-md text-fg-link">
          <Icon name="add" size={18} /> Ajouter
        </button>
      </div>

      {defis.length === 0 ? (
        <button
          type="button"
          onClick={() => setEdite("nouveau")}
          className="flex items-center gap-[var(--inline-lg)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-md)] text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
            <Icon name="flag" size={22} />
          </span>
          <span>
            <span className="block type-title-sm">Ajoute un défi</span>
            <span className="block type-body-sm text-fg-secondary">
              10 000 pas, 10 min de mobilité, 50 pompes… À tenir chaque jour en plus des séances, noté d’un geste depuis la Home.
            </span>
          </span>
        </button>
      ) : (
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
          {defis.map((d) => {
            const etat = !d.actif ? "En pause" : d.termine ? "Terminé" : d.a_venir ? `Dès le ${dateCourte(d.debut)}` : null;
            return (
              <li key={d.id} className="border-b border-line-subtle last:border-b-0">
                <button
                  type="button"
                  onClick={() => setEdite(d)}
                  className={`tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)] text-left ${etat && etat !== `Dès le ${dateCourte(d.debut)}` ? "opacity-60" : ""}`}
                >
                  <TuileIcone d={d} atteint={false} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-[var(--inline-sm)]">
                      <span className="truncate type-title-sm">{d.nom}</span>
                      {etat && <span className="kv-tag kv-tag-neutral shrink-0">{etat}</span>}
                    </span>
                    <span className="block truncate kv-mono">
                      {[
                        libelleCible(d.mesure, d.cible),
                        d.libelle_jours.toLowerCase(),
                        // La fin du programme est implicite : on ne la répète que si elle diffère.
                        d.fin === finProgramme ? null : d.fin ? `jusqu’au ${dateCourte(d.fin)}` : "sans fin",
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                  {d.actif && !d.termine && d.semaine.total > 0 && (
                    <span className="flex shrink-0 flex-col items-end">
                      <span className="type-label-md tabular-nums">
                        {d.semaine.atteints}/{d.semaine.total}
                      </span>
                      <span className="kv-mono">semaine</span>
                    </span>
                  )}
                  <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {edite && (
        <EditeurDefi
          defi={edite === "nouveau" ? null : edite}
          finProgramme={finProgramme}
          onFermer={() => setEdite(null)}
          onFait={(message) => {
            setEdite(null);
            setToast(message);
          }}
        />
      )}
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST_PIED} />
    </section>
  );
}

const MESURES: Array<[MesureDefi, string]> = [
  ["pas", "Pas"],
  ["minutes", "Minutes"],
  ["repetitions", "Reps"],
  ["case", "À cocher"],
];
/** Lundi d'abord (0 = dimanche, comme en base). */
const JOURS: Array<[number, string, string]> = [
  [1, "L", "lundi"],
  [2, "M", "mardi"],
  [3, "M", "mercredi"],
  [4, "J", "jeudi"],
  [5, "V", "vendredi"],
  [6, "S", "samedi"],
  [0, "D", "dimanche"],
];
const RACCOURCIS_JOURS: Array<[string, number[]]> = [
  ["Tous les jours", [0, 1, 2, 3, 4, 5, 6]],
  ["En semaine", [1, 2, 3, 4, 5]],
  ["Le week-end", [0, 6]],
];

function EditeurDefi({
  defi,
  finProgramme,
  onFermer,
  onFait,
}: {
  defi: EtatDefi | null;
  finProgramme: string | null;
  onFermer: () => void;
  onFait: (message: string) => void;
}) {
  const router = useRouter();
  const [nom, setNom] = useState(defi?.nom ?? "");
  const [mesure, setMesure] = useState<MesureDefi>(defi?.mesure ?? "pas");
  const [cible, setCible] = useState(defi?.cible ?? MESURES_DEFI.pas.cible);
  const [jours, setJours] = useState<number[]>(defi?.jours_semaine ?? [0, 1, 2, 3, 4, 5, 6]);
  const [avecProgramme, setAvecProgramme] = useState(defi ? defi.fin !== null : finProgramme !== null);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, start] = useTransition();

  const m = MESURES_DEFI[mesure];
  const valide = nom.trim().length > 0 && jours.length > 0 && (mesure === "case" || cible >= 1);
  const choisirMesure = (x: MesureDefi) => {
    setMesure(x);
    if (x !== mesure) setCible(MESURES_DEFI[x].cible);
  };
  const basculerJour = (j: number) => setJours((js) => (js.includes(j) ? js.filter((x) => x !== j) : [...js, j]));
  const memesJours = (a: number[], b: number[]) => a.length === b.length && a.every((x) => b.includes(x));

  const executerAction = (f: () => Promise<{ ok: true } | { ok: false; erreur: string }>, message: string) =>
    start(async () => {
      setErreur(null);
      const r = await f();
      if (!r.ok) return setErreur(r.erreur);
      router.refresh();
      onFait(message);
    });

  const enregistrer = () => {
    const entree = { nom: nom.trim(), mesure, cible: mesure === "case" ? 1 : cible, jours_semaine: jours };
    if (!defi) {
      executerAction(() => creerDefiAction({ ...entree, ...(avecProgramme ? {} : { fin: null }) }), `Défi « ${entree.nom} » ajouté.`);
    } else {
      const fin = avecProgramme ? (defi.fin ?? finProgramme) : null;
      executerAction(() => modifierDefiAction({ id: defi.id, ...entree, fin }), "Défi enregistré.");
    }
  };

  return (
    <BottomSheet
      ouvert
      onFermer={onFermer}
      titre={defi ? "Modifier le défi" : "Nouveau défi"}
      module="sport"
      pied={
        <button type="button" onClick={enregistrer} disabled={!valide || occupe} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
          <span className="kv-btn-label">{occupe ? "…" : defi ? "Enregistrer" : "Ajouter le défi"}</span>
        </button>
      }
    >
      <div className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-xs)]">
        {erreur && (
          <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
        )}

        {!defi && (
          <section className="flex flex-col gap-[var(--stack-xs)]">
            <span className="px-[var(--inline-xs)] type-title-sm">Idées</span>
            <div className="-mx-5 flex gap-[var(--inline-sm)] overflow-x-auto px-5 pb-1">
              {DEFIS_SUGGERES.map((s) => (
                <button
                  key={s.nom}
                  type="button"
                  aria-pressed={nom === s.nom && mesure === s.mesure}
                  onClick={() => {
                    setNom(s.nom);
                    setMesure(s.mesure);
                    setCible(s.cible);
                  }}
                  className={`kv-chip shrink-0 ${nom === s.nom && mesure === s.mesure ? "is-on" : ""}`}
                >
                  <Icon name={MESURES_DEFI[s.mesure].icone} size={16} />
                  {s.nom}
                  {s.mesure !== "case" ? ` · ${libelleCible(s.mesure, s.cible)}` : ""}
                </button>
              ))}
            </div>
          </section>
        )}

        <label className="flex flex-col gap-[var(--stack-xs)]">
          <span className="px-[var(--inline-xs)] type-title-sm">Nom</span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            maxLength={60}
            placeholder="Ex. Marcher, Gainage, Pas de sucre"
            className="h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
          />
        </label>

        <section className="flex flex-col gap-[var(--stack-xs)]">
          <span className="px-[var(--inline-xs)] type-title-sm">Ce qu’on compte</span>
          <div className="kv-seg" role="radiogroup" aria-label="Mesure">
            {MESURES.map(([v, l]) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={mesure === v}
                onClick={() => choisirMesure(v)}
                className={`kv-seg-item ${mesure === v ? "is-on" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        {mesure !== "case" && (
          <section className="flex flex-col gap-[var(--stack-xs)]">
            <span className="px-[var(--inline-xs)] type-title-sm">Objectif par jour</span>
            <div className="flex items-center justify-between rounded-[var(--radius-input)] bg-surface-container-sunken p-[var(--inset-xs)]">
              <button
                type="button"
                onClick={() => setCible((c) => Math.max(1, c - m.increment))}
                className="kv-iconbtn bg-surface-container-default"
                aria-label="Objectif : moins"
              >
                <Icon name="remove" size={20} />
              </button>
              <span className="flex items-baseline gap-[var(--inline-xs)]">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={cible}
                  onChange={(e) => setCible(Math.max(1, Math.round(Number(e.target.value) || 1)))}
                  onFocus={(e) => e.target.select()}
                  className="w-[7ch] bg-transparent text-right type-title-lg tabular-nums outline-none"
                  aria-label={`Objectif par jour (${m.unite})`}
                />
                <span className="type-body-md text-fg-secondary">{m.unite}</span>
              </span>
              <button
                type="button"
                onClick={() => setCible((c) => c + m.increment)}
                className="kv-iconbtn bg-surface-container-default"
                aria-label="Objectif : plus"
              >
                <Icon name="add" size={20} />
              </button>
            </div>
          </section>
        )}

        <section className="flex flex-col gap-[var(--stack-sm)]">
          <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
            <span className="type-title-sm">Quels jours</span>
            <span className="kv-mono">{jours.length ? libelleJours(jours) : "Choisis au moins un jour"}</span>
          </div>
          <div className="flex justify-between gap-[var(--inline-xs)]">
            {JOURS.map(([j, court, long]) => {
              const on = jours.includes(j);
              return (
                <button
                  key={j}
                  type="button"
                  aria-pressed={on}
                  aria-label={long}
                  onClick={() => basculerJour(j)}
                  className={`flex h-11 w-11 items-center justify-center rounded-full type-label-md ${
                    on ? "bg-action-primary text-fg-on-brand" : "border border-line-default text-fg-secondary"
                  }`}
                >
                  {court}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-[var(--inline-sm)]">
            {RACCOURCIS_JOURS.map(([l, js]) => (
              <button
                key={l}
                type="button"
                aria-pressed={memesJours(jours, js)}
                onClick={() => setJours(js)}
                className={`kv-chip ${memesJours(jours, js) ? "is-on" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
        </section>

        {(finProgramme || defi?.fin) && (
          <button
            type="button"
            role="switch"
            aria-checked={avecProgramme}
            onClick={() => setAvecProgramme((x) => !x)}
            className={`kv-switch w-full justify-between bg-surface-container-default ${avecProgramme ? "is-on" : ""}`}
          >
            <span className="text-left">
              <span className="block type-label-lg">Jusqu’à la fin du programme</span>
              <span className="block kv-mono">{avecProgramme ? `jusqu’au ${dateCourte((defi?.fin ?? finProgramme) as string)}` : "sans date de fin"}</span>
            </span>
            <span className="kv-switch-track">
              <span className="kv-switch-thumb" />
            </span>
          </button>
        )}

        {defi && (
          <section className="flex flex-col gap-[var(--stack-sm)] border-t border-line-subtle pt-[var(--stack-md)]">
            <button
              type="button"
              disabled={occupe}
              onClick={() =>
                executerAction(
                  () => modifierDefiAction({ id: defi.id, actif: !defi.actif }),
                  defi.actif ? `« ${defi.nom} » en pause.` : `« ${defi.nom} » relancé.`,
                )
              }
              className="kv-btn kv-btn-secondary kv-btn-lg kv-btn-block"
            >
              <Icon name={defi.actif ? "pause" : "play_arrow"} size={20} />
              <span className="kv-btn-label">{defi.actif ? "Mettre en pause" : "Relancer le défi"}</span>
            </button>
            <button
              type="button"
              disabled={occupe}
              onClick={() => (confirmer ? executerAction(() => supprimerDefiAction(defi.id), `« ${defi.nom} » supprimé.`) : setConfirmer(true))}
              className={`kv-btn kv-btn-lg kv-btn-block ${confirmer ? "kv-btn-danger" : "kv-btn-ghost text-feedback-danger-text"}`}
            >
              <Icon name="delete" size={20} />
              <span className="kv-btn-label">{confirmer ? "Confirmer : supprimer avec l’historique" : "Supprimer"}</span>
            </button>
            {confirmer && <p className="text-center type-body-sm text-fg-secondary">Pour garder l’historique, mets-le plutôt en pause.</p>}
          </section>
        )}
      </div>
    </BottomSheet>
  );
}
