import { Icon } from "./Icon";

type Props = { phase: string; ecran: string; points: string[] };

/** Écran prévu dans une phase ultérieure : rappelle ce qu'il fera, sans faire semblant. */
export function Placeholder({ phase, ecran, points }: Props) {
  return (
    <section className="mt-6 rounded-lg border border-dashed border-border p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">Phase {phase}</span>
        <h2 className="text-base font-semibold">{ecran}</h2>
      </div>
      <ul className="space-y-1.5 text-sm text-text-2">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <Icon name="check_indeterminate_small" size={18} className="mt-0.5 shrink-0 text-text-3" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
