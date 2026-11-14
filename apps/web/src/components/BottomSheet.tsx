"use client";
import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  titre?: string;
  /** Hauteur : contenu (défaut) ou pleine (90 %). */
  pleine?: boolean;
  /** Accent du module hôte pour les boutons dans la feuille. */
  module?: string;
  children: ReactNode;
};

/**
 * Feuille modale qui monte du bas (façon iOS) : voile, coins arrondis, poignée, zones sûres
 * (le haut ne monte jamais sous la barre d'état, le bas laisse l'indicateur d'accueil libre).
 * Se ferme au tap sur le voile, à Échap, ou via onFermer. Bloque le scroll de la page tant qu'elle est ouverte.
 */
export function BottomSheet({ ouvert, onFermer, titre, pleine, module: mod, children }: Props) {
  const id = useId();
  useEffect(() => {
    if (!ouvert) return;
    const precedent = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", touche);
    return () => {
      document.body.style.overflow = precedent;
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert, onFermer]);

  if (!ouvert || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby={titre ? id : undefined} data-module={mod}>
      <button type="button" aria-label="Fermer" onClick={onFermer} className="feuille-voile absolute inset-0 bg-black/45" />
      <div
        className={`feuille-panneau absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col rounded-t-[var(--radius-sheet)] bg-surface-canvas text-fg-primary shadow-2xl ${pleine ? "h-[calc(100dvh-env(safe-area-inset-top)-var(--stack-xl))]" : "max-h-[calc(100dvh-env(safe-area-inset-top)-var(--stack-xl))]"}`}
      >
        <div className="flex shrink-0 justify-center pb-1 pt-2.5">
          <span className="h-1.5 w-10 rounded-full bg-surface-sunken" />
        </div>
        {titre && (
          <div className="flex shrink-0 items-center justify-between px-5 pb-2">
            <h2 id={id} className="min-w-0 truncate type-title-lg">
              {titre}
            </h2>
            <button
              type="button"
              onClick={onFermer}
              aria-label="Fermer"
              className="kv-iconbtn shrink-0 border border-line-default bg-surface-container-default text-fg-primary"
            >
              <Icon name="close" size={22} />
            </button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom)+20px)]">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
