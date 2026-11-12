"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";

export type MarqueJour = { type: string; etat: string };
type Props = {
  /** Jour sélectionné (ISO). */
  jour: string;
  /** Aujourd'hui (ISO, fuseau utilisateur). */
  auj: string;
  /** Base de l'URL : `/sport` ou `/nutrition` → `?jour=`. */
  base: string;
  /** Séances du jour (prévue / faite, type) par ISO — plusieurs possibles (ex. muscu + boxe). */
  marques: Record<string, MarqueJour[]>;
  /** Nombre de jours affichés de chaque côté du jour sélectionné. */
  rayon?: number;
};

function decaler(jour: string, n: number) {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Bande de jours continue et scrollable : le jour sélectionné est centré au chargement (et recentré au changement).
 * Un point par séance sous le chiffre (accent = salle, orange = boxe, vert = faite) : deux points = double séance.
 */
export function BandeJours({ jour, auj, base, marques, rayon = 21 }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const premier = useRef(true);
  const jours = Array.from({ length: rayon * 2 + 1 }, (_, i) => decaler(jour, i - rayon));

  useEffect(() => {
    const actif = ref.current?.querySelector<HTMLElement>("[aria-current='date']");
    actif?.scrollIntoView({ inline: "center", block: "nearest", behavior: premier.current ? "instant" : "smooth" });
    premier.current = false;
  }, [jour]);

  return (
    <nav aria-label="Jours">
      <ul ref={ref} className="bande-jours flex gap-[var(--inline-md)] overflow-x-auto px-[var(--page-gutter)] py-[var(--stack-xs)]">
        {jours.map((j) => {
          const m = marques[j];
          const actif = j === jour;
          const estAuj = j === auj;
          const d = new Date(j + "T12:00:00");
          const premierDuMois = d.getDate() === 1;
          return (
            <li key={j} className="shrink-0">
              <Link
                href={`${base}?jour=${j}`}
                aria-current={actif ? "date" : undefined}
                aria-label={`${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${m?.length ? ` · ${m.length} séance${m.length > 1 ? "s" : ""}` : ""}`}
                scroll={false}
                className={`relative flex h-[66px] w-[var(--date-pill-w)] flex-col items-center justify-center gap-[var(--stack-2xs)] rounded-[var(--radius-control)] transition-colors ${actif ? "bg-action-primary text-fg-on-brand shadow-brand-glow" : "border border-line-subtle bg-surface-container-default"} ${!actif && estAuj ? "border-[length:var(--border-width-strong)] border-focus-ring" : ""}`}
              >
                <span className={`font-mono text-[10px] uppercase tracking-[0.08em] ${actif ? "text-fg-on-brand" : "text-fg-tertiary"}`}>
                  {premierDuMois
                    ? d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")
                    : estAuj
                      ? "Auj"
                      : d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                </span>
                <span className={`type-title-md ${!actif && estAuj ? "text-fg-brand" : ""}`}>{d.getDate()}</span>
                <span className="flex h-1.5 items-center gap-0.5" aria-hidden>
                  {(m ?? []).slice(0, 3).map((x, i) => (
                    <span
                      key={i}
                      className={`h-1.5 w-1.5 rounded-full ${actif ? "bg-surface-container-on-brand" : x.etat === "faite" ? "bg-feedback-success" : x.type === "boxe" ? "bg-surface-container-accent" : "bg-action-primary"}`}
                    />
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
