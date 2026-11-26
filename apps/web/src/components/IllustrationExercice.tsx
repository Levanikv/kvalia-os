"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * Crédit court à afficher sous une illustration (licence CC BY-SA 4.0, détail dans `docs/credits-illustrations.md`).
 * Depuis un server component, importe-le de `@kvalia/core` : ce fichier-ci est un module client.
 */
export { CREDIT_ILLUSTRATION } from "@kvalia/core";

type Props = {
  /** Illustration à montrer : `illustrationPour(nom)` de `@kvalia/core`. */
  slug: string;
  /** Fait alterner les poses du mouvement. Par défaut : la première pose, fixe. */
  anime?: boolean;
  /** Taille et couleur (`h-24 w-24 text-fg-brand`) : le dessin prend la couleur du texte. */
  className?: string;
  /** Nom lu par les lecteurs d'écran ; sans lui, l'illustration est décorative. */
  label?: string;
};

/** Durée d'affichage d'une pose. */
const PAS_MS = 700;

/** Poses déjà chargées (affichées sans attendre) et chargements en cours, partagés par toutes les instances. */
const pretes = new Map<string, string[]>();
const enCours = new Map<string, Promise<string[] | null>>();

function charger(slug: string): Promise<string[] | null> {
  let promesse = enCours.get(slug);
  if (!promesse) {
    promesse = fetch(`/illustrations/${encodeURIComponent(slug)}.json`)
      .then((r) => (r.ok ? (r.json() as Promise<{ poses: string[] }>) : null))
      .then((donnees) => {
        if (!donnees) return null;
        pretes.set(slug, donnees.poses);
        return donnees.poses;
      })
      // Hors ligne ou fichier absent : l'espace reste réservé, et le prochain affichage réessaiera.
      .catch(() => null)
      .finally(() => {
        if (!pretes.has(slug)) enCours.delete(slug);
      });
    enCours.set(slug, promesse);
  }
  return promesse;
}

const REDUIRE = "(prefers-reduced-motion: reduce)";

function abonnerReduire(rappel: () => void) {
  const media = window.matchMedia(REDUIRE);
  media.addEventListener("change", rappel);
  return () => media.removeEventListener("change", rappel);
}

/** Aller-retour entre les poses : 0, 1, 2, 1, 0… (ou 0, 1, 0… avec deux poses). */
function poseAuPas(pas: number, nombre: number) {
  if (nombre < 2) return 0;
  const cycle = pas % (2 * (nombre - 1));
  return cycle < nombre ? cycle : 2 * (nombre - 1) - cycle;
}

/**
 * Illustration d'exercice au trait (`/illustrations/<slug>.json`, 2 ou 3 poses dans un cadre 512×512), teintée par
 * `currentColor` : elle suit le thème clair/sombre et l'accent du module. Carrée ; pendant le chargement le même
 * cadre vide est rendu, donc pas de saut de mise en page. Sans animation si « réduire les animations » est actif.
 */
export function IllustrationExercice({ slug, anime = false, className = "", label }: Props) {
  const [charge, setCharge] = useState<{ slug: string; poses: string[] } | null>(null);
  const [pas, setPas] = useState(0);
  const reduire = useSyncExternalStore(
    abonnerReduire,
    () => window.matchMedia(REDUIRE).matches,
    () => false,
  );

  const poses = pretes.get(slug) ?? (charge?.slug === slug ? charge.poses : null);
  const enMouvement = anime && !reduire && poses !== null && poses.length > 1;

  useEffect(() => {
    if (pretes.has(slug)) return;
    let vivant = true;
    charger(slug).then((recues) => {
      if (vivant && recues) setCharge({ slug, poses: recues });
    });
    return () => {
      vivant = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!enMouvement) return;
    const minuteur = window.setInterval(() => setPas((p) => p + 1), PAS_MS);
    return () => window.clearInterval(minuteur);
  }, [enMouvement]);

  const trace = poses?.[enMouvement ? poseAuPas(pas, poses.length) : 0];

  return (
    <svg
      viewBox="0 0 512 512"
      fill="currentColor"
      className={`block aspect-square ${className}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      aria-busy={poses === null ? true : undefined}
    >
      {trace && <path d={trace} />}
    </svg>
  );
}
