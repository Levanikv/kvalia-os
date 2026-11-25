import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * Bilan du jour, posé à même le fond de la page (pas de carte) : le grand chiffre des calories restantes, l'anneau
 * de ce qui a été mangé — découpé par macro (protéines, glucides, lipides) —, trois tuiles « ce qu'il reste » par
 * macro, puis les séances du jour qui ajoutent des calories à la cible.
 */
type Seance = { id: string; type: string; titre: string | null; etat: string; kcal: number };
type Props = {
  cible: number;
  base: number;
  brule: number;
  consomme: number;
  reste: number;
  macros: Array<{ nom: string; valeur: number; cible: number; couleur: string; kcalParG: number }>;
  seances: Seance[];
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const R = 52;
const TOUR = 2 * Math.PI * R;
const TRAIT = 11;

export function Bilan({ cible, base, brule, consomme, reste, macros, seances }: Props) {
  const depasse = reste < 0;
  const part = cible > 0 ? Math.min(1, Math.max(0, consomme / cible)) : 0;
  // Arcs : la part mangée de l'anneau, répartie selon les calories de chaque macro. Bouts ronds → on retire
  // l'épaisseur du trait à chaque arc pour qu'ils ne se chevauchent pas.
  const kcalMacros = macros.map((m) => m.valeur * m.kcalParG);
  const totalMacros = kcalMacros.reduce((a, b) => a + b, 0);
  const arcs = macros.reduce<Array<{ couleur: string; debut: number; longueur: number }>>((liste, m, i) => {
    const debut = liste.reduce((a, x) => a + x.longueur, 0);
    const longueur = totalMacros > 0 ? (kcalMacros[i] / totalMacros) * part * TOUR : 0;
    return [...liste, { couleur: m.couleur, debut, longueur }];
  }, []);

  return (
    <section className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-xs)]" aria-label="Bilan du jour">
      <div className="flex items-center justify-between gap-[var(--inline-lg)] px-[var(--inline-xs)]">
        <div className="min-w-0">
          <p className="kv-overline text-fg-brand">{depasse ? "Tu as dépassé de" : "Il te reste"}</p>
          <p className="flex items-baseline gap-[var(--inline-sm)]">
            <span className={`type-display-xl ${depasse ? "text-feedback-danger-text" : ""}`}>{nf(Math.abs(reste))}</span>
            <span className="type-title-md text-fg-secondary">kcal</span>
          </p>
          <p className="type-body-sm text-fg-secondary">
            sur {nf(cible)}
            {brule > 0 ? (
              <>
                {" "}
                · {nf(base)} <span className="text-feedback-success-text">+ {nf(brule)} de sport</span>
              </>
            ) : null}
          </p>
        </div>
        <div className="kv-ring h-[7.75rem] w-[7.75rem]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${nf(consomme)} kcal mangées sur ${nf(cible)}`}>
            <circle cx="60" cy="60" r={R} fill="none" strokeWidth={TRAIT} className="kv-ring-track" />
            {depasse ? (
              <circle cx="60" cy="60" r={R} fill="none" strokeWidth={TRAIT} className="stroke-feedback-danger" />
            ) : (
              arcs.map(
                (a) =>
                  a.longueur > TRAIT + 2 && (
                    <circle
                      key={a.couleur}
                      cx="60"
                      cy="60"
                      r={R}
                      fill="none"
                      strokeWidth={TRAIT}
                      strokeLinecap="round"
                      className="kv-ring-fill"
                      style={{ stroke: a.couleur }}
                      strokeDasharray={`${(a.longueur - TRAIT - 2).toFixed(1)} ${TOUR.toFixed(1)}`}
                      strokeDashoffset={(-(a.debut + TRAIT / 2 + 1)).toFixed(1)}
                    />
                  ),
              )
            )}
          </svg>
          <div className="kv-ring-center">
            <span className="type-title-lg tabular-nums">{nf(consomme)}</span>
            <span className="kv-mono">mangées</span>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-[var(--inline-md)]">
        {macros.map((m) => {
          const resteG = Math.round(m.cible - m.valeur);
          const p = m.cible > 0 ? Math.min(1, Math.max(0, m.valeur / m.cible)) : 0;
          const r = 26;
          const tour = 2 * Math.PI * r;
          return (
            <div
              key={m.nom}
              className="flex flex-col items-center gap-[var(--stack-xs)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default px-[var(--inset-xs)] py-[var(--inset-sm)] shadow-card"
            >
              <dt className="flex items-center gap-[var(--inline-xs)] type-label-md">
                <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} aria-hidden />
                {m.nom}
              </dt>
              <dd className="flex flex-col items-center gap-[var(--stack-2xs)]">
                <span className="kv-ring h-[4.25rem] w-[4.25rem]">
                  <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90" aria-hidden>
                    <circle cx="32" cy="32" r={r} fill="none" strokeWidth="5" className="kv-ring-track" />
                    {p > 0.02 && (
                      <circle
                        cx="32"
                        cy="32"
                        r={r}
                        fill="none"
                        strokeWidth="5"
                        strokeLinecap="round"
                        className="kv-ring-fill"
                        style={{ stroke: m.couleur }}
                        strokeDasharray={`${(p * tour).toFixed(1)} ${tour.toFixed(1)}`}
                      />
                    )}
                  </svg>
                  <span className="kv-ring-center">
                    <span className="type-title-sm tabular-nums">{nf(Math.abs(resteG))} g</span>
                  </span>
                </span>
                <span className="kv-mono">{resteG >= 0 ? "restants" : "en trop"}</span>
              </dd>
            </div>
          );
        })}
      </dl>

      {seances.length > 0 && (
        <ul className="-mx-[var(--page-gutter)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--page-gutter)]">
          {seances.map((s) => (
            <li key={s.id} className="shrink-0">
              <Link href={`/sport/seance/${s.id}`} className="kv-chip flex items-center gap-[var(--inline-xs)]">
                <Icon name={s.type === "boxe" ? "sports_mma" : "fitness_center"} size={16} />
                <span className="max-w-[10rem] truncate">{s.titre ?? s.type}</span>
                <span className="text-fg-secondary">
                  · {s.kcal > 0 ? `+${nf(s.kcal)} kcal` : s.etat === "en_cours" ? "en cours" : s.etat === "faite" ? "terminée" : "prévue"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
