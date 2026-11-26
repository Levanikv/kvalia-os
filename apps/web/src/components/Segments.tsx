import Link from "next/link";

export type Segment<T extends string> = { cle: T; label: string /** Lien (segments de navigation) ; sans lien, `onChoisir` est appelé. */; href?: string };

type Props<T extends string> = {
  items: ReadonlyArray<Segment<T>>;
  actif: T;
  /** Nom du groupe pour les lecteurs d'écran (« Vue du programme »). */
  label: string;
  onChoisir?: (cle: T) => void;
};

/**
 * Segmented control (`.kv-seg` du design system, en grand) : deux ou trois vues d'un même écran, pour ne montrer
 * qu'une chose à la fois. Avec `href`, chaque segment est un lien (`?vue=` : l'état reste dans l'URL) ; sinon un
 * bouton qui appelle `onChoisir` (état local d'un composant client).
 */
export function Segments<T extends string>({ items, actif, label, onChoisir }: Props<T>) {
  return (
    <div className="kv-seg segments" role="tablist" aria-label={label}>
      {items.map((it) => {
        const on = it.cle === actif;
        const classes = `kv-seg-item flex items-center justify-center ${on ? "is-on" : ""}`;
        return it.href ? (
          <Link key={it.cle} href={it.href} role="tab" aria-selected={on} replace scroll={false} className={classes}>
            {it.label}
          </Link>
        ) : (
          <button key={it.cle} type="button" role="tab" aria-selected={on} onClick={() => onChoisir?.(it.cle)} className={classes}>
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
