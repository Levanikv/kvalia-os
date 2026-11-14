"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { EcranPlein } from "@/components/kv/EcranPlein";
import { modifierProgrammeAction } from "../../actions";

type Perso = { jour: number; modele_id: string };
type Props = {
  programme: { debut: string; fin: string | null; objectif: string };
  initial: { jours_salle: number[]; seances_perso: Perso[]; duree_min: number; semaines: number };
  modeles: Array<{ id: string; nom: string; nb: number; duree: number }>;
  dates: { aujourdhui: string; demain: string; lundi: string };
};

const JOURS = [
  { v: 1, l: "Lundi" },
  { v: 2, l: "Mardi" },
  { v: 3, l: "Mercredi" },
  { v: 4, l: "Jeudi" },
  { v: 5, l: "Vendredi" },
  { v: 6, l: "Samedi" },
  { v: 0, l: "Dimanche" },
];
const DUREES = [45, 60, 75, 90];

/** Choix d'un jour : repos, séance générée (IA) ou une séance perso. */
type Choix = { genre: "repos" } | { genre: "genere" } | { genre: "perso"; modele_id: string };

/** Édition du programme actif : semaine type jour par jour, durée, semaines, date d'application. */
export function EditeurProgramme({ programme, initial, modeles, dates }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [jours, setJours] = useState<Record<number, Choix>>(() => {
    const o: Record<number, Choix> = {};
    for (const j of JOURS) {
      const p = initial.seances_perso.find((x) => x.jour === j.v);
      o[j.v] = p ? { genre: "perso", modele_id: p.modele_id } : initial.jours_salle.includes(j.v) ? { genre: "genere" } : { genre: "repos" };
    }
    return o;
  });
  const [duree, setDuree] = useState(initial.duree_min);
  const [semaines, setSemaines] = useState(initial.semaines);
  const [depuis, setDepuis] = useState(dates.aujourdhui);
  const [ouvert, setOuvert] = useState<number | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const nomModele = (id: string) => modeles.find((m) => m.id === id)?.nom ?? "Ma séance";
  const nbSeances = Object.values(jours).filter((c) => c.genre !== "repos").length;
  const fin = (() => {
    const d = new Date(programme.debut + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + semaines * 7 - 1);
    return d.toISOString().slice(0, 10);
  })();
  const date = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", o);
  const changements =
    JSON.stringify(jours) !==
      JSON.stringify(
        Object.fromEntries(
          JOURS.map((j) => {
            const p = initial.seances_perso.find((x) => x.jour === j.v);
            return [j.v, p ? { genre: "perso", modele_id: p.modele_id } : initial.jours_salle.includes(j.v) ? { genre: "genere" } : { genre: "repos" }];
          }),
        ),
      ) ||
    duree !== initial.duree_min ||
    semaines !== initial.semaines;

  function enregistrer() {
    setEnvoi(true);
    setErreur(null);
    const jours_salle = JOURS.filter((j) => jours[j.v].genre === "genere").map((j) => j.v);
    const seances_perso = JOURS.flatMap((j) => {
      const c = jours[j.v];
      return c.genre === "perso" ? [{ jour: j.v, modele_id: c.modele_id }] : [];
    });
    start(async () => {
      try {
        await modifierProgrammeAction({ jours_salle, seances_perso, duree_min: duree, semaines, a_partir_de: depuis });
        router.push("/sport/programme");
        router.refresh();
      } catch (e) {
        setEnvoi(false);
        setErreur(e instanceof Error ? e.message : "La modification a échoué.");
      }
    });
  }

  return (
    <EcranPlein
      retour="/sport/programme"
      surTitre={`Modifier · ${programme.objectif}`}
      titre="Ton programme"
      sousTitre="Change tes jours, la durée ou la longueur : les séances non faites sont reposées, le reste ne bouge pas."
      pied={
        <button
          type="button"
          onClick={enregistrer}
          disabled={!changements || envoi || nbSeances === 0}
          className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block"
        >
          <span className="kv-btn-label">{envoi ? "Mise à jour…" : "Enregistrer les modifications"}</span>
        </button>
      }
    >
      {erreur && <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>}

      {/* Semaine type */}
      <section className="flex flex-col gap-[var(--stack-sm)]">
        <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
          <h2 className="type-title-lg">Semaine type</h2>
          <span className="kv-mono">
            {nbSeances} séance{nbSeances > 1 ? "s" : ""} / sem.
          </span>
        </div>
        <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
          {JOURS.map((j) => {
            const c = jours[j.v];
            return (
              <li key={j.v} className="border-b border-line-subtle last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOuvert(j.v)}
                  className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full type-label-lg ${
                      c.genre === "repos"
                        ? "bg-action-tertiary text-fg-secondary"
                        : c.genre === "perso"
                          ? "bg-action-primary text-fg-on-brand"
                          : "bg-surface-container-inverse text-fg-inverse"
                    }`}
                  >
                    {j.l[0]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block type-title-sm">{j.l}</span>
                    <span className="block truncate kv-mono">
                      {c.genre === "repos" ? "Repos" : c.genre === "genere" ? "Séance générée par l’IA" : `Ma séance · ${nomModele(c.modele_id)}`}
                    </span>
                  </span>
                  <Icon name="expand_more" size={20} className="text-icon-tertiary" />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Durée */}
      <section className="flex flex-col gap-[var(--stack-sm)]">
        <h2 className="px-[var(--inline-xs)] type-title-sm">Durée des séances générées</h2>
        <div className="kv-seg" role="radiogroup" aria-label="Durée">
          {[...new Set([...DUREES, duree])]
            .sort((a, b) => a - b)
            .map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duree === d}
                onClick={() => setDuree(d)}
                className={`kv-seg-item ${duree === d ? "is-on" : ""}`}
              >
                {d} min
              </button>
            ))}
        </div>
      </section>

      {/* Semaines */}
      <section className="flex items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
        <div>
          <p className="kv-overline">Durée du programme</p>
          <p className="type-display-md">
            {semaines} <span className="kv-mono">semaines</span>
          </p>
          <p className="kv-mono">fin {date(fin, { day: "numeric", month: "short", year: "numeric" })}</p>
        </div>
        <div className="flex gap-[var(--inline-md)]">
          <button
            type="button"
            onClick={() => setSemaines((s) => Math.max(4, s - 1))}
            className="kv-iconbtn kv-iconbtn-lg border border-line-default bg-surface-container-default"
            aria-label="Une semaine de moins"
          >
            <Icon name="remove" size={24} />
          </button>
          <button
            type="button"
            onClick={() => setSemaines((s) => Math.min(24, s + 1))}
            className="kv-iconbtn kv-iconbtn-lg kv-iconbtn-primary"
            aria-label="Une semaine de plus"
          >
            <Icon name="add" size={24} />
          </button>
        </div>
      </section>

      {/* À partir de */}
      <section className="flex flex-col gap-[var(--stack-sm)]">
        <h2 className="px-[var(--inline-xs)] type-title-sm">À partir de</h2>
        <div className="kv-seg" role="radiogroup" aria-label="Date d’application">
          {(
            [
              [dates.aujourdhui, "Aujourd’hui"],
              [dates.demain, "Demain"],
              [dates.lundi, `Lundi ${date(dates.lundi, { day: "numeric" })}`],
            ] as const
          ).map(([v, l]) => (
            <button
              key={l}
              type="button"
              role="radio"
              aria-checked={depuis === v}
              onClick={() => setDepuis(v)}
              className={`kv-seg-item ${depuis === v ? "is-on" : ""}`}
            >
              {l}
            </button>
          ))}
        </div>
        <p className="px-[var(--inline-xs)] type-body-sm text-fg-secondary">
          Les séances faites ou en cours ne bougent pas. Les semaines, blocs et décharges restent ceux du programme.
        </p>
      </section>

      <div className="flex flex-col gap-[var(--stack-sm)]">
        <Link href="/sport/ma-seance/nouvelle" className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
          <Icon name="add" size={20} />
          <span className="kv-btn-label">Créer une séance perso</span>
        </Link>
        <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-ghost kv-btn-lg kv-btn-block">
          <span className="kv-btn-label">Changer d’objectif → nouveau programme</span>
        </Link>
      </div>

      {/* Choix d'un jour */}
      <BottomSheet ouvert={ouvert !== null} onFermer={() => setOuvert(null)} titre={JOURS.find((j) => j.v === ouvert)?.l} module="sport">
        {ouvert !== null && (
          <div className="flex flex-col gap-[var(--stack-sm)]" role="radiogroup" aria-label="Séance du jour">
            {[
              { c: { genre: "repos" } as Choix, t: "Repos", d: "Récupération" },
              { c: { genre: "genere" } as Choix, t: "Séance générée", d: "L’IA choisit le split, les exercices et la progression" },
              ...modeles.map((m) => ({ c: { genre: "perso", modele_id: m.id } as Choix, t: m.nom, d: `Ma séance · ${m.nb} exercices · ≈ ${m.duree} min` })),
            ].map(({ c, t, d }) => {
              const actuel = jours[ouvert];
              const on = actuel.genre === c.genre && (c.genre !== "perso" || (actuel.genre === "perso" && actuel.modele_id === c.modele_id));
              return (
                <button
                  key={t + (c.genre === "perso" ? c.modele_id : "")}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setJours((x) => ({ ...x, [ouvert]: c }));
                    setOuvert(null);
                  }}
                  className={`flex w-full items-center gap-[var(--inline-lg)] rounded-[var(--radius-tile)] border p-[var(--inset-sm)] text-left ${on ? "border-line-brand-solid bg-surface-container-brand-subtle" : "border-line-default bg-surface-container-default"}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block type-title-sm">{t}</span>
                    <span className="block type-body-sm text-fg-secondary">{d}</span>
                  </span>
                  {on && <Icon name="check" size={20} className="text-icon-brand" />}
                </button>
              );
            })}
            {modeles.length === 0 && (
              <Link href="/sport/ma-seance/nouvelle" className="tap flex items-center gap-[var(--inline-sm)] type-label-md text-fg-link">
                <Icon name="add" size={18} /> Créer une séance perso pour ce jour
              </Link>
            )}
          </div>
        )}
      </BottomSheet>
    </EcranPlein>
  );
}
