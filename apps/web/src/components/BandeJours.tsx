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
  /** Jours marqués (séance prévue / faite, type) par ISO. */
  marques: Record<string, MarqueJour>;
  /** Nombre de jours affichés de chaque côté du jour sélectionné. */
  rayon?: number;
};

function decaler(jour: string, n: number) {
  const d = new Date(jour + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/**
 * Bande de jours continue et scrollable : le jour sélectionné est centré au chargement (et recentré au changement).
 * Un point sous le chiffre indique une séance (accent = salle, orange = boxe, vert = faite).
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
      <ul ref={ref} className="bande-jours flex gap-1 overflow-x-auto px-4 py-1">
        {jours.map((j) => {
          const m = marques[j];
          const actif = j === jour;
          const estAuj = j === auj;
          const d = new Date(j + "T12:00:00");
          const premierDuMois = d.getDate() === 1;
          return (
            <li key={j} className="shrink-0">
              <Link href={`${base}?jour=${j}`} aria-current={actif ? "date" : undefined} scroll={false}
                className={`tap relative flex w-12 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition-colors ${actif ? "bg-accent text-white" : estAuj ? "bg-accent-soft" : ""}`}>
                <span className={`text-[10px] uppercase ${actif ? "text-white/80" : "text-text-3"}`}>
                  {premierDuMois ? d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "") : d.toLocaleDateString("fr-FR", { weekday: "narrow" })}
                </span>
                <span className={`text-base font-semibold leading-tight ${!actif && estAuj ? "text-accent" : ""}`}>{d.getDate()}</span>
                <span className={`h-1.5 w-1.5 rounded-full ${m ? (m.etat === "faite" ? (actif ? "bg-white" : "bg-success") : m.type === "boxe" ? (actif ? "bg-white/80" : "bg-[#f0872b]") : actif ? "bg-white/70" : "bg-accent") : "bg-transparent"}`} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
