import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Props = {
  /** Ce que mesure la tuile (« Cette semaine », « Énergie »). */
  titre: string;
  /** Le chiffre, en grand. */
  valeur: ReactNode;
  /** Unité ou complément, en petit à côté du chiffre (« / 4 », « kcal »). */
  unite?: string;
  /** Une ligne de contexte sous le chiffre. */
  detail?: string;
  /** Avancement 0–1 : une jauge fine sous le chiffre. */
  part?: number;
  icone?: string;
  href?: string;
  module?: string;
};

/**
 * Tuile de chiffre : un seul nombre, gros, sur une carte claire, avec ce qu'il mesure et une ligne de contexte.
 * Deux par ligne sur les accueils (Sport, Nutrition) ; cliquable quand elle mène au détail.
 */
export function Tuile({ titre, valeur, unite, detail, part, icone, href, module: mod }: Props) {
  const corps = (
    <>
      <span className="flex items-center justify-between gap-[var(--inline-sm)]">
        <span className="flex min-w-0 items-center gap-[var(--inline-sm)] type-label-md text-fg-secondary">
          {icone && <Icon name={icone} size={18} className="shrink-0 text-fg-brand" />}
          <span className="truncate">{titre}</span>
        </span>
        {href && <Icon name="chevron_right" size={18} className="shrink-0 text-icon-tertiary" />}
      </span>
      <span className="flex items-baseline gap-[var(--inline-xs)]">
        <span className="type-display-md tabular-nums">{valeur}</span>
        {unite && <span className="type-label-md text-fg-tertiary">{unite}</span>}
      </span>
      {part !== undefined && (
        <span className="kv-progress-track" aria-hidden>
          <span className="kv-progress-fill block bg-action-primary" style={{ width: `${Math.round(Math.min(1, Math.max(0, part)) * 100)}%` }} />
        </span>
      )}
      {detail && <span className="line-clamp-2 type-body-sm text-fg-secondary">{detail}</span>}
    </>
  );
  const classes =
    "flex min-w-0 flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)]";
  return href ? (
    <Link href={href} data-module={mod} className={`tap ${classes}`}>
      {corps}
    </Link>
  ) : (
    <div data-module={mod} className={classes}>
      {corps}
    </div>
  );
}
