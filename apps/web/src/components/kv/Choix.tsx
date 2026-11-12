import type { ReactNode } from "react";
import { Icon } from "../Icon";

type Tuile = {
  titre: ReactNode;
  description?: ReactNode;
  actif: boolean;
  onClick: () => void;
  /** Indicateur rond en haut à droite (choix multiples). */
  indicateur?: boolean;
  className?: string;
};

/** Tuile de choix (design system : Goal tile / Choice tile) — inversée quand elle est choisie, `aria-pressed`. */
export function TuileChoix({ titre, description, actif, onClick, indicateur, className = "" }: Tuile) {
  return (
    <button type="button" aria-pressed={actif} onClick={onClick} className={`kv-goal ${actif ? "is-on" : ""} ${className}`}>
      {indicateur && (
        <span className="kv-goal-sel" aria-hidden>
          {actif ? <Icon name="check" size={14} /> : null}
        </span>
      )}
      <span className="type-label-lg">{titre}</span>
      {description ? <span className="kv-goal-desc">{description}</span> : null}
    </button>
  );
}

type Ligne = { titre: ReactNode; description?: ReactNode; actif: boolean; onClick: () => void };

/** Ligne d'option à choix unique (radio) : titre + ligne d'aide, pastille à droite. */
export function LigneChoix({ titre, description, actif, onClick }: Ligne) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={actif}
      onClick={onClick}
      className="flex min-h-[var(--control-min)] w-full items-center gap-[var(--inline-lg)] border-b border-line-default py-[var(--control-inset-sm)] text-left"
    >
      <span className="min-w-0 flex-1">
        <span className={`block type-label-lg ${actif ? "text-fg-primary" : "text-fg-secondary"}`}>{titre}</span>
        {description ? <span className="block type-body-sm text-fg-tertiary">{description}</span> : null}
      </span>
      <span
        aria-hidden
        className={`h-5 w-5 shrink-0 rounded-full ${actif ? "border-[length:var(--border-width-indicator)] border-action-primary" : "border-[length:var(--border-width-strong)] border-line-strong"}`}
      />
    </button>
  );
}
