"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BasculeDemo, DemoDessin, DESSIN_DABORD } from "@/components/DemoDessin";
import { Icon } from "@/components/Icon";
import { CREDIT_MEDIA, estAnimation } from "../../lib";

export type Video = {
  nom: string;
  video: string | null;
  image: string | null;
  /** Dessin au trait animé, montré d'abord quand il existe (la démonstration filmée reste à un tap). */
  illustration?: string | null;
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
 * Vidéo en feuille (B01, version feuille) : la démonstration au format d'origine 16:9, entière, puis la prescription
 * et l'action — la feuille prend la hauteur de son contenu (plus tout l'écran). Monte du bas, se ferme en glissant
 * l'en-tête vers le bas, avec la croix ou Échap. Zones sûres : jamais sous la barre d'état, l'action du bas reste
 * au-dessus de l'indicateur d'accueil.
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
  const [dessin, setDessin] = useState(DESSIN_DABORD);
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

  // Glisser vers le bas pour fermer (depuis l'en-tête de la feuille).
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
        className="feuille-panneau absolute inset-x-0 bottom-0 mx-auto flex max-w-lg flex-col overflow-hidden rounded-t-[var(--radius-sheet)] bg-surface-page text-fg-primary"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - var(--stack-sm))",
          transform: ferme ? "translateY(100%)" : `translateY(${dy}px)`,
          transition: glisse ? "none" : "transform var(--duration-base) var(--ease-emphasized)",
        }}
      >
        {/* En-tête : poignée (glisser pour fermer), repère, croix. */}
        <div className="flex shrink-0 touch-none flex-col items-center pb-[var(--stack-sm)] pt-[var(--stack-xs)]" {...geste}>
          <span className="h-1.5 w-10 rounded-full bg-divider-default" aria-hidden />
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

        {/* Vidéo au format d'origine (16:9), entière : plus de recadrage en hauteur. */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-container-inverse">
          {v.illustration && dessin ? (
            <DemoDessin slug={v.illustration} nom={v.nom} />
          ) : estAnimation(v.video) ? (
            <>
              <img src={v.video ?? ""} alt="" className="h-full w-full bg-white object-contain" />
              <span className="absolute bottom-1 right-2 kv-mono text-black/60">{CREDIT_MEDIA}</span>
            </>
          ) : v.video ? (
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
              className="h-full w-full object-contain"
            />
          ) : v.image ? (
            <img src={v.image} alt="" className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full items-center justify-center text-fg-tertiary">
              <Icon name="videocam_off" size={40} />
            </div>
          )}
          {v.illustration && v.video && <BasculeDemo dessin={dessin} onChoisir={setDessin} />}
          {v.video && !estAnimation(v.video) && !(v.illustration && dessin) && (
            <button type="button" onClick={basculer} aria-label={lecture ? "Pause" : "Lecture"} className="absolute inset-0 flex items-center justify-center">
              <span
                className={`flex h-14 w-14 items-center justify-center rounded-full bg-action-glass backdrop-blur transition-opacity ${lecture ? "opacity-0" : "opacity-100"}`}
              >
                <Icon name="play_arrow" size={30} filled />
              </span>
            </button>
          )}
          {v.video && !estAnimation(v.video) && temps.d > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-action-glass" aria-hidden>
              <div className="h-full bg-action-primary" style={{ width: `${(temps.t / temps.d) * 100}%` }} />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col gap-[var(--stack-md)] overflow-y-auto px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))] pt-[var(--stack-md)]">
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
