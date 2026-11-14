"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import type { ExoVue } from "./SeanceLive";
import { formatChrono } from "./temps";

type Props = {
  exo: ExoVue | null;
  index: number;
  total: number;
  modifiable: boolean;
  onFermer: () => void;
  onTermine: (exo: ExoVue) => void;
};

/**
 * B01 · Vidéo immersive plein écran (depuis la vignette ▶). Les contrôles respectent les zones sûres :
 * fermer et le compteur sous la barre d'état / Dynamic Island, le bouton du bas au-dessus de l'indicateur d'accueil.
 */
export function VideoImmersive({ exo, index, total, modifiable, onFermer, onTermine }: Props) {
  useEffect(() => {
    if (!exo) return;
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
  }, [exo, onFermer]);

  if (!exo || typeof document === "undefined") return null;
  return createPortal(
    <Lecteur key={exo.id} exo={exo} index={index} total={total} modifiable={modifiable} onFermer={onFermer} onTermine={onTermine} />,
    document.body,
  );
}

function Lecteur({ exo, index, total, modifiable, onFermer, onTermine }: Props & { exo: ExoVue }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lecture, setLecture] = useState(true);
  const [temps, setTemps] = useState({ t: 0, d: 0 });
  const charge = exo.charge_kg ?? exo.derniere?.charge_kg ?? null;

  function basculer() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setLecture(true);
    } else {
      v.pause();
      setLecture(false);
    }
  }

  return (
    <div
      data-module="sport"
      data-theme="dark"
      role="dialog"
      aria-modal="true"
      aria-label={`Vidéo : ${exo.nom}`}
      className="fixed inset-0 z-[70] flex flex-col bg-surface-page text-fg-primary"
    >
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {exo.video ? (
          <video
            ref={ref}
            src={exo.video}
            poster={exo.image ?? undefined}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            onTimeUpdate={(e) => setTemps({ t: e.currentTarget.currentTime, d: e.currentTarget.duration || 0 })}
            className="h-full w-full object-cover"
          />
        ) : exo.image ? (
          <img src={exo.image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-fg-tertiary">
            <Icon name="videocam_off" size={40} />
          </div>
        )}
        {/* Haut : sous la zone sûre (barre d'état, Dynamic Island). */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[var(--page-gutter)] pt-[calc(env(safe-area-inset-top)+var(--stack-sm))]">
          <span className="kv-overline text-fg-secondary">
            Exercice {index + 1} / {total}
          </span>
          <button type="button" onClick={onFermer} className="kv-iconbtn kv-iconbtn-glass" aria-label="Fermer la vidéo">
            <Icon name="close" size={24} />
          </button>
        </div>
        {exo.video && (
          <button
            type="button"
            onClick={basculer}
            aria-label={lecture ? "Pause" : "Lecture"}
            className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-action-glass backdrop-blur"
          >
            <Icon name={lecture ? "pause" : "play_arrow"} size={36} filled />
          </button>
        )}
        {exo.video && temps.d > 0 && (
          <div className="absolute inset-x-0 bottom-0 px-[var(--page-gutter)] pb-[var(--stack-sm)]">
            <div className="h-1 overflow-hidden rounded-full bg-action-glass" aria-hidden>
              <div className="h-full bg-action-primary" style={{ width: `${(temps.t / temps.d) * 100}%` }} />
            </div>
            <p className="mt-[var(--stack-xs)] flex justify-between kv-mono">
              <span>{formatChrono(temps.t)}</span>
              <span>{formatChrono(temps.d)}</span>
            </p>
          </div>
        )}
      </div>

      {/* Bas : au-dessus de l'indicateur d'accueil (zone sûre basse). */}
      <div className="flex flex-col gap-[var(--stack-md)] px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))] pt-[var(--stack-md)]">
        <div>
          <p className="kv-overline text-fg-brand">
            {exo.series} × {exo.reps}
            {exo.partie ? ` · ${exo.partie}` : ""}
          </p>
          <h2 className="type-display-md">{exo.nom}</h2>
        </div>
        <dl className="grid grid-cols-3 gap-[var(--inline-lg)]">
          {[
            ["Reps", exo.reps],
            ["Charge", charge !== null ? `${String(charge).replace(".", ",")} kg` : "—"],
            ["Repos", exo.repos_s ? formatChrono(exo.repos_s) : "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="kv-overline">{k}</dt>
              <dd className="type-title-md">{v}</dd>
            </div>
          ))}
        </dl>
        {modifiable && !exo.fait && (
          <button type="button" onClick={() => onTermine(exo)} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
            <Icon name="check" size={22} />
            <span className="kv-btn-label">Exercice terminé</span>
          </button>
        )}
      </div>
    </div>
  );
}
