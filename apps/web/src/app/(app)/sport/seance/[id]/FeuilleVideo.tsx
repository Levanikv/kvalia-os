"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/Icon";
import { formatChrono } from "./temps";

export type Video = {
  nom: string;
  video: string | null;
  image: string | null;
  /** Surtitre (« 3 × 8 · Triceps »). */
  detail: string;
  /** Repère en haut (« Exercice 3 / 5 »). */
  repere?: string;
  stats?: Array<[string, string]>;
};
type Props = {
  video: Video | null;
  onFermer: () => void;
  /** Action principale en bas (« Exercice terminé »), facultative. */
  action?: { label: string; icone?: string; onClick: () => void } | null;
};

/**
 * Vidéo en feuille plein-hauteur (B01, version feuille) : monte du bas, se ferme en la glissant vers le bas,
 * avec la croix ou Échap — on reste sur l'écran d'où on vient. Zones sûres : la feuille s'arrête sous la barre
 * d'état, l'action du bas reste au-dessus de l'indicateur d'accueil.
 */
export function FeuilleVideo({ video, onFermer, action }: Props) {
  useEffect(() => {
    if (!video) return;
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
  }, [video, onFermer]);
  if (!video || typeof document === "undefined") return null;
  return createPortal(<Panneau key={video.nom + (video.video ?? "")} video={video} onFermer={onFermer} action={action} />, document.body);
}

function Panneau({ video: v, onFermer, action }: Props & { video: Video }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [lecture, setLecture] = useState(true);
  const [temps, setTemps] = useState({ t: 0, d: 0 });
  const [dy, setDy] = useState(0);
  const depart = useRef<number | null>(null);
  const [glisse, setGlisse] = useState(false);
  const [ferme, setFerme] = useState(false);

  function fermer() {
    setFerme(true);
    setTimeout(onFermer, 220);
  }
  function basculer() {
    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
      setLecture(true);
    } else {
      el.pause();
      setLecture(false);
    }
  }

  // Glisser vers le bas pour fermer (depuis la poignée / le haut de la vidéo).
  const geste = {
    onPointerDown: (e: React.PointerEvent) => {
      depart.current = e.clientY;
      setGlisse(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (depart.current == null) return;
      setDy(Math.max(0, e.clientY - depart.current));
    },
    onPointerUp: () => {
      if (depart.current == null) return;
      depart.current = null;
      setGlisse(false);
      if (dy > 120) fermer();
      else setDy(0);
    },
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Vidéo : ${v.nom}`}>
      <button
        type="button"
        aria-label="Fermer"
        onClick={fermer}
        className={`feuille-voile absolute inset-0 bg-black/60 transition-opacity duration-200 ${ferme ? "opacity-0" : ""}`}
        style={dy ? { opacity: Math.max(0.2, 1 - dy / 500) } : undefined}
      />
      <div
        data-module="sport"
        data-theme="dark"
        className="feuille-panneau absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-sheet)] bg-surface-page text-fg-primary shadow-2xl"
        style={{
          top: "calc(env(safe-area-inset-top) + var(--stack-sm))",
          transform: ferme ? "translateY(100%)" : `translateY(${dy}px)`,
          transition: glisse ? "none" : "transform var(--duration-base) var(--ease-emphasized)",
        }}
      >
        <div className="relative min-h-0 flex-1 touch-none overflow-hidden" {...geste}>
          {v.video ? (
            <video
              ref={ref}
              src={v.video}
              poster={v.image ?? undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              onTimeUpdate={(e) => setTemps({ t: e.currentTarget.currentTime, d: e.currentTarget.duration || 0 })}
              className="h-full w-full object-cover"
            />
          ) : v.image ? (
            <img src={v.image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-fg-tertiary">
              <Icon name="videocam_off" size={40} />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex flex-col items-center bg-gradient-to-b from-black/50 to-transparent pb-[var(--stack-lg)] pt-[var(--stack-xs)]">
            <span className="h-1.5 w-10 rounded-full bg-white/60" aria-hidden />
            <div className="mt-[var(--stack-xs)] flex w-full items-center justify-between px-[var(--page-gutter)]">
              <span className="kv-overline text-fg-secondary">{v.repere ?? "Démonstration"}</span>
              <button
                type="button"
                onClick={fermer}
                onPointerDown={(e) => e.stopPropagation()}
                className="kv-iconbtn kv-iconbtn-glass"
                aria-label="Fermer la vidéo"
              >
                <Icon name="close" size={24} />
              </button>
            </div>
          </div>
          {v.video && (
            <button
              type="button"
              onClick={basculer}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={lecture ? "Pause" : "Lecture"}
              className={`absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-action-glass backdrop-blur transition-opacity ${lecture ? "opacity-0 hover:opacity-100 focus-visible:opacity-100" : "opacity-100"}`}
            >
              <Icon name={lecture ? "pause" : "play_arrow"} size={36} filled />
            </button>
          )}
          {v.video && temps.d > 0 && (
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

        <div className="flex flex-col gap-[var(--stack-md)] px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))] pt-[var(--stack-md)]">
          <div>
            <p className="kv-overline text-fg-brand">{v.detail}</p>
            <h2 className="type-display-md">{v.nom}</h2>
          </div>
          {v.stats && (
            <dl className="grid grid-cols-3 gap-[var(--inline-lg)]">
              {v.stats.map(([k, x]) => (
                <div key={k}>
                  <dt className="kv-overline">{k}</dt>
                  <dd className="type-title-md">{x}</dd>
                </div>
              ))}
            </dl>
          )}
          {action && (
            <button
              type="button"
              onClick={() => {
                action.onClick();
                fermer();
              }}
              className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block"
            >
              {action.icone && <Icon name={action.icone} size={22} />}
              <span className="kv-btn-label">{action.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
