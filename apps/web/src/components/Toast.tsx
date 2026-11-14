"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type Props = {
  /** Texte du toast ; null = masqué. Changer le texte relance le délai. */
  message: string | null;
  onFermer: () => void;
  /** Action à droite (« Annuler »), facultative. */
  action?: { label: string; onClick: () => void } | null;
  /** Durée d'affichage (ms). */
  duree?: number;
  /**
   * Distance au bas de l'écran, au-dessus d'une barre d'action fixe. La zone sûre (barre d'accueil iPhone)
   * est toujours ajoutée : le toast ne passe jamais sous l'indicateur d'accueil.
   */
  bas?: string;
};

/** Toast du design system (`.kv-toast`) : confirmation brève, en bas, au-dessus de la barre d'action. */
export function Toast({ message, onFermer, action, duree = 3000, bas = "calc(var(--control-xl) + var(--stack-xl))" }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onFermer, duree);
    return () => clearTimeout(t);
  }, [message, duree, onFermer]);
  if (!message || typeof document === "undefined") return null;
  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-[55] flex justify-center px-[var(--page-gutter)]"
      style={{ bottom: `calc(${bas} + env(safe-area-inset-bottom))` }}
    >
      <div className="kv-toast pointer-events-auto w-full max-w-lg">
        <span className="kv-toast-icon kv-toast-success">
          <Icon name="check" size={18} />
        </span>
        <span className="kv-toast-text">{message}</span>
        {action && (
          <button type="button" className="kv-toast-action" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
