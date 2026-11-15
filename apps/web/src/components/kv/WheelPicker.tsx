"use client";
import { useCallback, useLayoutEffect, useMemo, useRef } from "react";

type Props = {
  /** Surtitre au-dessus de la roue, aussi nom accessible : « Taille », « Poids ». */
  label: string;
  /** Unité en mono après la valeur choisie : « CM », « KG », « ANS ». */
  unite?: string;
  valeur: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  /** 1, 0.5… les décimales suivent le pas (virgule française). */
  pas?: number;
  petit?: boolean;
};

/** Hauteur d'une ligne de la roue (px) et nombre de lignes visibles (impair). */
const LIGNE = 44;
const VISIBLES = 5;

/**
 * Roue verticale (design system : Wheel picker) à défilement natif : inertie iOS, aimantation sur chaque valeur,
 * un geste rapide fait défiler plusieurs valeurs d'un coup. Effet de profondeur (taille, opacité, inclinaison)
 * recalculé à chaque image sans re-rendu React. Toucher une valeur la centre ; clavier : ↑ ↓, PageUp/PageDown
 * (×10), Début/Fin. `role="spinbutton"`.
 */
export function WheelPicker({ label, unite, valeur, onChange, min, max, pas = 1, petit }: Props) {
  const dec = (String(pas).split(".")[1] ?? "").length;
  const valeurs = useMemo(() => {
    const n = Math.round((max - min) / pas);
    return Array.from({ length: n + 1 }, (_, i) => +(min + i * pas).toFixed(dec));
  }, [min, max, pas, dec]);
  const fmt = (x: number) => x.toFixed(dec).replace(".", ",");
  const indexDe = useCallback((v: number) => Math.min(valeurs.length - 1, Math.max(0, Math.round((v - min) / pas))), [valeurs.length, min, pas]);

  const boite = useRef<HTMLDivElement>(null);
  const items = useRef<Array<HTMLDivElement | null>>([]);
  const emis = useRef(valeur);
  const image = useRef<number | null>(null);

  /** Profondeur : chaque ligne selon sa distance au centre (en lignes). */
  const peindre = useCallback(() => {
    const el = boite.current;
    if (!el) return;
    const centre = el.scrollTop / LIGNE;
    const debut = Math.max(0, Math.floor(centre) - 4);
    const fin = Math.min(items.current.length - 1, Math.ceil(centre) + 4);
    for (let i = debut; i <= fin; i++) {
      const it = items.current[i];
      if (!it) continue;
      const d = Math.min(3, Math.abs(i - centre));
      const echelle = 1 - d * 0.16;
      it.style.transform = `perspective(400px) rotateX(${(i - centre) * -18}deg) scale(${echelle})`;
      it.style.opacity = String(Math.max(0.12, 1 - d * 0.36));
      it.style.fontWeight = d < 0.5 ? "800" : "600";
    }
  }, []);

  // Position initiale (sans animation) et quand la valeur change de l'extérieur (clavier, réinitialisation).
  // Avant peinture, puis encore à l'image suivante : l'aimantation (scroll-snap) peut reprendre la main au montage.
  const pose = useRef(false);
  useLayoutEffect(() => {
    const el = boite.current;
    if (!el) return;
    if (pose.current && valeur === emis.current) return;
    pose.current = true;
    emis.current = valeur;
    const cible = indexDe(valeur) * LIGNE;
    el.scrollTop = cible;
    peindre();
    const id = requestAnimationFrame(() => {
      if (Math.abs(el.scrollTop - cible) > 2) el.scrollTop = cible;
      peindre();
    });
    return () => cancelAnimationFrame(id);
  }, [valeur, indexDe, peindre]);

  function surScroll() {
    if (image.current != null) return;
    image.current = requestAnimationFrame(() => {
      image.current = null;
      const el = boite.current;
      if (!el) return;
      peindre();
      const v = valeurs[Math.min(valeurs.length - 1, Math.max(0, Math.round(el.scrollTop / LIGNE)))];
      if (v !== emis.current) {
        emis.current = v;
        onChange(v);
      }
    });
  }

  function aller(v: number, doux = true) {
    const b = Math.min(max, Math.max(min, +v.toFixed(dec)));
    boite.current?.scrollTo({ top: indexDe(b) * LIGNE, behavior: doux ? "smooth" : "auto" });
  }

  return (
    <div className={`kv-wheel ${petit ? "kv-wheel-sm" : ""}`}>
      <span className="kv-wheel-label">{label}</span>
      <div className="kv-wheel-win" style={{ height: LIGNE * VISIBLES }}>
        <span className="kv-wheel-band" aria-hidden style={{ top: LIGNE * ((VISIBLES - 1) / 2), height: LIGNE }} />
        {unite && (
          <span className="kv-wheel-unit kv-wheel-unit-fixe" aria-hidden style={{ top: LIGNE * ((VISIBLES - 1) / 2), height: LIGNE }}>
            {unite}
          </span>
        )}
        <div
          ref={boite}
          className="kv-wheel-scroll"
          role="spinbutton"
          tabIndex={0}
          aria-label={label}
          aria-valuenow={valeur}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={`${fmt(valeur)}${unite ? ` ${unite}` : ""}`}
          onScroll={surScroll}
          onKeyDown={(e) => {
            const d: Record<string, number> = { ArrowUp: -pas, ArrowDown: pas, PageUp: -pas * 10, PageDown: pas * 10, Home: min - valeur, End: max - valeur };
            if (e.key in d) {
              e.preventDefault();
              aller(valeur + d[e.key]);
            }
          }}
          style={{ paddingBlock: LIGNE * ((VISIBLES - 1) / 2) }}
        >
          {valeurs.map((x, i) => (
            <div
              key={x}
              ref={(n) => {
                items.current[i] = n;
              }}
              aria-hidden
              className="kv-wheel-item"
              style={{ height: LIGNE }}
              onClick={() => aller(x)}
            >
              {fmt(x)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
