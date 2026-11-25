/**
 * Bilan du jour, posé à même le fond de la page (pas de carte) : le grand chiffre des calories restantes, l'anneau
 * de ce qui a été mangé — découpé par macro —, puis une ligne de trois jauges fines (protéines, glucides, lipides).
 * Rien d'autre : le détail (base, sport, séances) vit dans Sport et dans Réglages › Nutrition.
 */
type Props = {
  cible: number;
  brule: number;
  consomme: number;
  reste: number;
  macros: Array<{ nom: string; valeur: number; cible: number; couleur: string; kcalParG: number }>;
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const R = 52;
const TOUR = 2 * Math.PI * R;
const TRAIT = 11;

export function Bilan({ cible, brule, consomme, reste, macros }: Props) {
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
            sur {nf(cible)} kcal{brule > 0 ? ` · dont ${nf(brule)} de sport` : ""}
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

      <dl className="grid grid-cols-3 gap-[var(--inline-lg)] px-[var(--inline-xs)]">
        {macros.map((m) => (
          <div key={m.nom} className="flex min-w-0 flex-col gap-[var(--stack-xs)]">
            <dt className="type-label-md">{m.nom}</dt>
            <dd className="flex flex-col gap-[var(--stack-xs)]">
              <span className="kv-progress-track" aria-hidden>
                <span
                  className="kv-progress-fill block"
                  style={{ width: `${Math.min(100, (m.valeur / Math.max(1, m.cible)) * 100)}%`, background: m.couleur }}
                />
              </span>
              <span className="kv-mono">
                <span className="text-fg-primary">{nf(Math.round(m.valeur))}</span> / {nf(m.cible)} g
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
