type Props = {
  /** Accent du module pendant le chargement (fond, couleurs). */
  module?: string;
  /** Forme du contenu attendu. */
  variante?: "liste" | "jour" | "seance" | "plein";
};

/**
 * Écran de chargement instantané (loading.tsx) : s'affiche dès le tap, pendant que le serveur prépare la page.
 * Mêmes zones sûres que les vrais écrans (en-tête sous la barre d'état). Respecte « réduire les animations ».
 */
export function Squelette({ module, variante = "liste" }: Props) {
  const bloc = "squelette rounded-[var(--radius-card)] bg-surface-container-sunken";
  return (
    <div data-module={module} className="kv-ground min-h-dvh bg-surface-page" aria-busy="true" aria-label="Chargement">
      <div className="mx-auto max-w-lg px-[var(--page-gutter)] pt-safe">
        <div className="flex items-end gap-[var(--inline-md)] py-[var(--stack-sm)]">
          <span className="squelette h-10 w-10 rounded-full bg-surface-container-sunken" />
          <div className="flex-1">
            <span className="squelette block h-3 w-28 rounded-full bg-surface-container-sunken" />
            <span className="squelette mt-2 block h-8 w-48 rounded-[var(--radius-sm)] bg-surface-container-sunken" />
          </div>
          {variante !== "seance" && variante !== "plein" && <span className="squelette h-10 w-10 rounded-full bg-surface-container-sunken" />}
        </div>
        {variante === "jour" && (
          <div className="flex gap-[var(--inline-md)] overflow-hidden pb-[var(--stack-sm)]">
            {Array.from({ length: 7 }, (_, i) => (
              <span key={i} className="squelette h-16 w-12 shrink-0 rounded-[var(--radius-control)] bg-surface-container-sunken" />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-sm)]">
          {variante === "seance" ? (
            <>
              <span className={`${bloc} h-28`} />
              {Array.from({ length: 5 }, (_, i) => (
                <span key={i} className="squelette h-[78px] rounded-[var(--radius-tile)] bg-surface-container-sunken" />
              ))}
            </>
          ) : (
            <>
              <span className={`${bloc} h-56 !rounded-[var(--radius-card-hero)]`} />
              <span className={`${bloc} h-28`} />
              <span className={`${bloc} h-40`} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
