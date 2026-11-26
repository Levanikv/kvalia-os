"use client";
import { CREDIT_ILLUSTRATION, IllustrationExercice } from "./IllustrationExercice";

/**
 * Où les dessins au trait prennent la place des visuels Gym visual. Les dessins sont de qualité inégale (une moitié
 * au trait, une moitié en silhouettes pleines) : tant que ce n'est pas tranché, la démonstration filmée reste
 * montrée d'abord et les vignettes restent celles de la bibliothèque ; le dessin est à un tap dans les démonstrations.
 */
export const DESSIN_DABORD = false;
export const DESSIN_EN_VIGNETTE = false;

/**
 * Démonstration dessinée d'un exercice : le dessin au trait animé (2 ou 3 poses), centré dans le cadre de son
 * parent (16:9), teinté par le thème, avec la mention de licence. À poser dans un conteneur `relative`.
 */
export function DemoDessin({ slug, nom }: { slug: string; nom: string }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-surface-container-sunken text-fg-primary">
      <IllustrationExercice slug={slug} anime label={nom ? `Démonstration : ${nom}` : undefined} className="h-full" />
      <span className="absolute bottom-1 right-2 max-w-[60%] truncate kv-mono text-fg-tertiary">{CREDIT_ILLUSTRATION}</span>
    </div>
  );
}

/** Bascule Dessin / Vidéo, en bas à gauche du cadre : le dessin d'abord, la démonstration filmée à un tap. */
export function BasculeDemo({ dessin, onChoisir }: { dessin: boolean; onChoisir: (dessin: boolean) => void }) {
  return (
    <div
      className="absolute bottom-2 left-2 z-10 flex overflow-hidden rounded-full border border-line-subtle bg-surface-container-default type-label-md text-fg-primary"
      role="group"
      aria-label="Type de démonstration"
    >
      {(
        [
          [true, "Dessin"],
          [false, "Vidéo"],
        ] as const
      ).map(([v, l]) => (
        <button
          key={l}
          type="button"
          aria-pressed={dessin === v}
          onClick={() => onChoisir(v)}
          className={`px-3 py-1.5 ${dessin === v ? "bg-surface-container-inverse text-fg-inverse" : ""}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
