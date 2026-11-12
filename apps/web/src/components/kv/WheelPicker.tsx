"use client";
import { useRef } from "react";

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

/**
 * Roue verticale (design system : Wheel picker) pour une seule valeur : glisser, molette, toucher une valeur voisine,
 * ou clavier (↑ ↓, PageUp/PageDown ×10, Début/Fin). `role="spinbutton"`.
 */
export function WheelPicker({ label, unite, valeur, onChange, min, max, pas = 1, petit }: Props) {
  const dec = (String(pas).split(".")[1] ?? "").length;
  const y0 = useRef<number | null>(null);
  const glisse = useRef(false);
  const fmt = (x: number) => x.toFixed(dec).replace(".", ",");
  const borne = (x: number) => Math.min(max, Math.max(min, +x.toFixed(dec)));
  const regler = (x: number) => {
    const b = borne(x);
    if (b !== valeur) onChange(b);
  };
  return (
    <div
      className={`kv-wheel ${petit ? "kv-wheel-sm" : ""}`}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={valeur}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuetext={`${fmt(valeur)}${unite ? ` ${unite}` : ""}`}
      onKeyDown={(e) => {
        const d: Record<string, number> = { ArrowUp: pas, ArrowDown: -pas, PageUp: pas * 10, PageDown: -pas * 10, Home: min - valeur, End: max - valeur };
        if (e.key in d) {
          e.preventDefault();
          regler(valeur + d[e.key]);
        }
      }}
      onWheel={(e) => regler(valeur + (e.deltaY > 0 ? 1 : -1) * pas)}
      onPointerDown={(e) => {
        y0.current = e.clientY;
        glisse.current = false;
      }}
      onPointerUp={(e) => {
        if (y0.current == null) return;
        const dy = y0.current - e.clientY;
        y0.current = null;
        if (Math.abs(dy) > 8) {
          glisse.current = true;
          const n = Math.round(dy / 40);
          if (n) regler(valeur + n * pas);
        }
      }}
    >
      <span className="kv-wheel-label">{label}</span>
      <div className="kv-wheel-win">
        <span className="kv-wheel-band" aria-hidden />
        {[-2, -1, 0, 1, 2].map((d) => {
          const x = +(valeur + d * pas).toFixed(dec);
          const hors = x < min || x > max;
          const cls = d === 0 ? "is-on" : Math.abs(d) === 1 ? "is-near" : "is-far";
          return (
            <div
              key={d}
              aria-hidden
              className={`kv-wheel-item ${cls} ${hors ? "is-empty" : ""}`}
              onClick={() => {
                if (glisse.current) {
                  glisse.current = false;
                  return;
                }
                if (!hors) regler(x);
              }}
            >
              <span>{hors ? "·" : fmt(x)}</span>
              {d === 0 && unite ? <span className="kv-wheel-unit">{unite}</span> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
