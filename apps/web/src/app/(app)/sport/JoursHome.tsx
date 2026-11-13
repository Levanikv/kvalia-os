"use client";
import Link from "next/link";
import { useLayoutEffect, useRef } from "react";

export type PastilleJour = {
  jour: string;
  lettre: string;
  numero: number;
  etat: "passe" | "defaut" | "auj" | "on";
  points: Array<"fait" | "prevu" | "alt">;
  label: string;
};

const COULEUR_POINT = { fait: "var(--feedback-success)", prevu: "var(--surface-container-brand)", alt: "var(--surface-container-inverse)" } as const;

/**
 * Bande de jours de la Home Sport (composant Figma « Date pill ») : défile horizontalement,
 * le jour choisi arrive en 4ᵉ position comme sur la maquette (trois jours passés visibles à gauche).
 */
export function JoursHome({ pastilles }: { pastilles: PastilleJour[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const actif = pastilles.findIndex((p) => p.etat === "on");
  useLayoutEffect(() => {
    const el = ref.current;
    const cible = el?.children[actif] as HTMLElement | undefined;
    const avant = el?.children[Math.max(0, actif - 3)] as HTMLElement | undefined;
    if (el && cible && avant) el.scrollLeft = avant.offsetLeft - (el.firstElementChild as HTMLElement).offsetLeft;
  }, [actif]);
  return (
    <nav aria-label="Choisir un jour">
      <div ref={ref} className="hs-jours">
        {pastilles.map((p) => (
          <Link
            key={p.jour}
            href={`/sport?jour=${p.jour}`}
            scroll={false}
            aria-label={p.label}
            aria-current={p.etat === "on" ? "date" : undefined}
            className={`hs-pill ${p.etat === "passe" ? "is-passe" : p.etat === "auj" ? "is-auj" : p.etat === "on" ? "is-on" : ""}`}
          >
            <span className="hs-pill-l hs-mono-wide">{p.lettre}</span>
            <span className="hs-date-day">{p.numero}</span>
            <span className="hs-points" aria-hidden>
              {p.points.slice(0, 3).map((x, i) => (
                <span key={i} className="hs-point" style={{ background: COULEUR_POINT[x] }} />
              ))}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
