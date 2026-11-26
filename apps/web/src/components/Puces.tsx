"use client";

type Props<T extends string> = {
  /** Les choix, dans l'ordre ; `null` = « Tout ». */
  items: ReadonlyArray<{ cle: T; label: string }>;
  actif: T | null;
  onChoisir: (cle: T | null) => void;
  label: string;
  /** Libellé du choix « sans filtre ». */
  tout?: string;
};

/**
 * Une seule rangée de puces qui défile (le filtre principal d'une liste : partie du corps, repas). Un seul choix à
 * la fois, « Tout » en premier. Les filtres secondaires vont dans une feuille (`BoutonFiltres`), pas dans une
 * deuxième rangée.
 */
export function Puces<T extends string>({ items, actif, onChoisir, label, tout = "Tout" }: Props<T>) {
  return (
    <div className="puces -mx-[var(--page-gutter)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--page-gutter)]" role="radiogroup" aria-label={label}>
      <button
        type="button"
        role="radio"
        aria-checked={actif === null}
        onClick={() => onChoisir(null)}
        className={`kv-chip shrink-0 ${actif === null ? "is-on" : ""}`}
      >
        {tout}
      </button>
      {items.map((it) => (
        <button
          key={it.cle}
          type="button"
          role="radio"
          aria-checked={actif === it.cle}
          onClick={() => onChoisir(actif === it.cle ? null : it.cle)}
          className={`kv-chip shrink-0 ${actif === it.cle ? "is-on" : ""}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
