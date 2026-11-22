"use client";
import { useState } from "react";
import { CHOIX_MORPHO, type Morpho } from "@kvalia/core";

/**
 * Choix de la morphologie par curseur : une silhouette qui se transforme en continu pendant qu'on glisse
 * (mince → athlétique → costaud → rond), et qui se cale sur le repère le plus proche au relâchement.
 * La valeur rendue est toujours un des 4 repères du noyau (`Morpho`) ; `null` = pas encore choisi.
 */

/** Mesures de la silhouette à chaque repère (demi-largeurs et épaisseurs, dans un viewBox 140 × 220). */
const FORMES = [
  { epaules: 25, taille: 15, hanches: 17, bras: 9, jambes: 13, cou: 9 }, // mince
  { epaules: 33, taille: 18, hanches: 19, bras: 13, jambes: 17, cou: 12 }, // athlétique
  { epaules: 38, taille: 27, hanches: 25, bras: 17, jambes: 21, cou: 15 }, // costaud
  { epaules: 34, taille: 37, hanches: 32, bras: 16, jambes: 23, cou: 16 }, // rond
];
type Forme = (typeof FORMES)[number];

function formeA(pos: number): Forme {
  const i = Math.min(FORMES.length - 2, Math.max(0, Math.floor(pos)));
  const t = Math.min(1, Math.max(0, pos - i));
  const a = FORMES[i];
  const b = FORMES[i + 1];
  const mix = (k: keyof Forme) => a[k] + (b[k] - a[k]) * t;
  return { epaules: mix("epaules"), taille: mix("taille"), hanches: mix("hanches"), bras: mix("bras"), jambes: mix("jambes"), cou: mix("cou") };
}

function Silhouette({ pos }: { pos: number }) {
  const f = formeA(pos);
  const c = 70;
  const n = (x: number) => x.toFixed(1);
  const E = f.epaules;
  const T = f.taille;
  const H = f.hanches;
  const torse = [
    `M ${n(c - E)} 54`,
    `Q ${n(c - E)} 44 ${n(c - E + 9)} 44`,
    `L ${n(c + E - 9)} 44`,
    `Q ${n(c + E)} 44 ${n(c + E)} 54`,
    `C ${n(c + E)} 76 ${n(c + T)} 82 ${n(c + T)} 102`,
    `C ${n(c + T)} 112 ${n(c + H)} 114 ${n(c + H)} 126`,
    `L ${n(c - H)} 126`,
    `C ${n(c - H)} 114 ${n(c - T)} 112 ${n(c - T)} 102`,
    `C ${n(c - T)} 82 ${n(c - E)} 76 ${n(c - E)} 54`,
    "Z",
  ].join(" ");
  // Bras décollés du buste (un filet de vide), pour qu'ils restent lisibles sur les silhouettes larges.
  const xBras = E + f.bras / 2 - 3;
  const xJambe = Math.max(f.jambes / 2 + 1, H - f.jambes / 2);
  return (
    <svg viewBox="-10 0 160 220" className="h-56 w-auto text-fg-primary" role="img" aria-hidden>
      <g fill="currentColor" stroke="currentColor" strokeLinecap="round">
        <circle cx={c} cy={21} r={14} stroke="none" />
        <rect x={c - f.cou / 2} y={30} width={f.cou} height={18} stroke="none" />
        <path d={torse} stroke="none" />
        {/* Bras */}
        <line x1={c - xBras} y1={54} x2={c - Math.max(xBras, T + f.bras / 2 + 3) - 4} y2={118} strokeWidth={f.bras} />
        <line x1={c + xBras} y1={54} x2={c + Math.max(xBras, T + f.bras / 2 + 3) + 4} y2={118} strokeWidth={f.bras} />
        {/* Jambes */}
        <line x1={c - xJambe} y1={126} x2={c - Math.max(f.jambes / 2 + 1, xJambe * 0.8)} y2={206} strokeWidth={f.jambes} />
        <line x1={c + xJambe} y1={126} x2={c + Math.max(f.jambes / 2 + 1, xJambe * 0.8)} y2={206} strokeWidth={f.jambes} />
      </g>
    </svg>
  );
}

type Props = { valeur: Morpho | null | undefined; onChange: (m: Morpho) => void };

export function CurseurMorpho({ valeur, onChange }: Props) {
  const index = valeur ? CHOIX_MORPHO.findIndex((x) => x.id === valeur) : -1;
  // Position continue pendant le glissement ; sans choix, la silhouette part du repère « athlétique ».
  const [pos, setPos] = useState(index >= 0 ? index : 1);
  const proche = Math.round(pos);
  const choix = index >= 0 ? CHOIX_MORPHO[proche] : null;

  const choisir = (i: number) => {
    setPos(i);
    onChange(CHOIX_MORPHO[i].id);
  };

  return (
    <div className="flex flex-col items-center gap-[var(--stack-md)]">
      <div className="flex w-full flex-col items-center gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-lg)]">
        <Silhouette pos={pos} />
        <div className="text-center" aria-live="polite">
          <p className="type-title-lg">{choix ? choix.titre : "Fais glisser le curseur"}</p>
          <p className="type-body-sm text-fg-secondary">{choix ? choix.aide : "Choisis la silhouette la plus proche de la tienne."}</p>
        </div>
      </div>
      <div className="w-full">
        <input
          type="range"
          min={0}
          max={CHOIX_MORPHO.length - 1}
          step={0.01}
          value={pos}
          onChange={(e) => {
            const v = Number(e.target.value);
            setPos(v);
            onChange(CHOIX_MORPHO[Math.round(v)].id);
          }}
          onPointerUp={() => setPos((v) => Math.round(v))}
          onKeyUp={() => setPos((v) => Math.round(v))}
          onBlur={() => setPos((v) => Math.round(v))}
          aria-label="Morphologie"
          aria-valuetext={choix?.titre ?? "Non choisie"}
          className="h-[var(--control-min)] w-full accent-[var(--action-primary)]"
        />
        <div className="flex justify-between">
          {CHOIX_MORPHO.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choisir(i)}
              aria-pressed={valeur === o.id}
              className={`tap px-[var(--inline-xs)] type-label-md ${valeur === o.id ? "text-fg-primary" : "text-fg-tertiary"}`}
            >
              {o.titre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
