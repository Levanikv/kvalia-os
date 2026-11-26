/**
 * Bilan du jour — une seule carte claire, lue en une seconde : l'anneau au centre (ce qu'il reste, en grand ;
 * l'arc = ce qui a été mangé, découpé par macro), mangées à gauche, brûlées à droite, puis trois jauges fines
 * (protéines, glucides, lipides). Le détail (base, sport, séances) vit dans Sport et dans Réglages › Nutrition.
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
const TRAIT = 9;

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
    <section
      className="flex flex-col gap-[var(--stack-lg)] rounded-[var(--radius-card-hero)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-lg)]"
      aria-label="Bilan du jour"
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-[var(--inline-sm)]">
        <Chiffre valeur={nf(consomme)} label="Mangées" />
        <div className="kv-ring h-[10.5rem] w-[10.5rem]">
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
            <span className={`type-display-lg tabular-nums ${depasse ? "text-feedback-danger-text" : ""}`}>{nf(Math.abs(reste))}</span>
            <span className="type-label-md text-fg-secondary">{depasse ? "kcal en trop" : "kcal restantes"}</span>
          </div>
        </div>
        <Chiffre valeur={nf(brule)} label="Brûlées" />
      </div>

      <dl className="grid grid-cols-3 gap-[var(--inline-lg)] border-t border-line-subtle px-[var(--inline-xs)] pt-[var(--stack-md)]">
        {macros.map((m) => (
          <div key={m.nom} className="flex min-w-0 flex-col gap-[var(--stack-xs)]">
            <dt className="type-label-md text-fg-secondary">{m.nom}</dt>
            <dd className="flex flex-col gap-[var(--stack-xs)]">
              <span className="kv-progress-track" aria-hidden>
                <span
                  className="kv-progress-fill block"
                  style={{ width: `${Math.min(100, (m.valeur / Math.max(1, m.cible)) * 100)}%`, background: m.couleur }}
                />
              </span>
              <span className="type-label-md tabular-nums">
                {nf(Math.round(m.valeur))} <span className="font-normal text-fg-tertiary">/ {nf(m.cible)} g</span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Chiffre({ valeur, label }: { valeur: string; label: string }) {
  return (
    <p className="flex min-w-0 flex-col items-center text-center">
      <span className="type-title-lg tabular-nums">{valeur}</span>
      <span className="type-label-md text-fg-secondary">{label}</span>
    </p>
  );
}
