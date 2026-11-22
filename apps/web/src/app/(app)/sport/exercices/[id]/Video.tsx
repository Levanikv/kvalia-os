"use client";
import { useState } from "react";
import { Icon } from "@/components/Icon";

type Props = { src: string | null; srcF: string | null; poster: string | null; posterF: string | null };

/** Vidéo en boucle, muette, inline (autoplay iOS), au format d'origine 16:9 ; bascule démonstrateur H/F si les deux existent. */
export function Video({ src, srcF, poster, posterF }: Props) {
  const [femme, setFemme] = useState(false);
  const [erreur, setErreur] = useState(false);
  const url = femme && srcF ? srcF : src;
  const affiche = femme && posterF ? posterF : poster;

  return (
    <div className="relative -mx-4 aspect-video overflow-hidden bg-surface-container-inverse sm:mx-0 sm:rounded-lg">
      {url && !erreur ? (
        <video
          key={url}
          src={url}
          poster={affiche ?? undefined}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          onError={() => setErreur(true)}
          className="h-full w-full object-contain"
        />
      ) : affiche ? (
        <img src={affiche} alt="" className="h-full w-full object-contain" />
      ) : (
        <div className="flex h-full items-center justify-center text-fg-tertiary">
          <Icon name="videocam_off" size={40} />
        </div>
      )}
      {src && srcF && (
        <div className="absolute bottom-3 right-3 flex overflow-hidden rounded-full bg-action-glass type-label-md text-fg-primary backdrop-blur">
          <button type="button" onClick={() => setFemme(false)} className={`px-3 py-1.5 ${!femme ? "bg-white/25" : ""}`}>
            H
          </button>
          <button type="button" onClick={() => setFemme(true)} className={`px-3 py-1.5 ${femme ? "bg-white/25" : ""}`}>
            F
          </button>
        </div>
      )}
    </div>
  );
}
