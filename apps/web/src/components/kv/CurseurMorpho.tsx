"use client";
import { useId, useState } from "react";
import { CHOIX_MORPHO, type Morpho } from "@kvalia/core";

/**
 * Choix de la morphologie par curseur : une silhouette dessinée (contour du corps, de la nuque aux pieds) qui se
 * transforme en continu pendant qu'on glisse — mince → athlétique → costaud → rond — et se cale sur le repère le plus
 * proche au relâchement. La valeur rendue est toujours un des 4 repères du noyau (`Morpho`) ; `null` = pas encore choisi.
 */

/**
 * Demi-contour droit du corps : 34 points, de la nuque à l'entrejambe, en passant par l'épaule, le bras (extérieur
 * puis intérieur), le flanc, la hanche et la jambe (extérieur puis intérieur). Les hauteurs sont communes aux 4
 * repères ; seules les largeurs (distance à l'axe du corps) changent — c'est ce qu'on interpole.
 */
const Y = [
  48, 60, 68, 76, 92, 122, 152, 178, 202, 216, 229, 216, 202, 178, 152, 124, 102, 116, 146, 172, 196, 216, 252, 292, 322, 370, 389, 394, 388, 370, 322, 292,
  252, 214,
];
const X: number[][] = [
  // mince
  [6, 7, 19, 36, 45, 49, 51, 56, 56, 57, 53, 49, 49, 47, 43, 39, 32, 29, 27, 24, 27, 29, 27, 23, 22, 15, 19, 12, 7, 7, 7, 6, 4, 0],
  // athlétique
  [7, 9, 26, 46, 58, 63, 64, 70, 69, 70, 65, 59, 59, 56, 52, 48, 40, 38, 34, 29, 32, 35, 34, 29, 29, 19, 24, 15, 8, 9, 9, 8, 5, 0],
  // costaud
  [9, 11, 33, 53, 68, 75, 76, 82, 80, 81, 76, 69, 69, 65, 60, 56, 48, 46, 44, 40, 42, 45, 44, 37, 36, 22, 29, 18, 10, 11, 11, 10, 7, 0],
  // rond
  [10, 12, 31, 48, 61, 72, 79, 86, 86, 87, 82, 75, 75, 72, 65, 58, 48, 46, 52, 56, 54, 52, 49, 40, 37, 23, 29, 18, 10, 11, 11, 10, 8, 0],
];
/** Rayon horizontal de la tête à chaque repère. */
const TETE = [16, 17, 18.5, 20];

const LARGEUR = 200;
const AXE = LARGEUR / 2;

function interp(table: number[], pos: number): number {
  const i = Math.min(table.length - 2, Math.max(0, Math.floor(pos)));
  const t = Math.min(1, Math.max(0, pos - i));
  return table[i] + (table[i + 1] - table[i]) * t;
}
/** Largeurs interpolées entre deux repères voisins. */
function largeurs(pos: number): number[] {
  const i = Math.min(X.length - 2, Math.max(0, Math.floor(pos)));
  const t = Math.min(1, Math.max(0, pos - i));
  return X[i].map((a, k) => a + (X[i + 1][k] - a) * t);
}

/** Courbe fermée lisse passant par les points (Catmull-Rom → Bézier cubique). */
function courbeFermee(pts: Array<[number, number]>, tension = 0.5): string {
  const n = pts.length;
  const p = (i: number) => pts[(i + n) % n];
  const f = (v: number) => v.toFixed(1);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    const c1 = [p1[0] + ((p2[0] - p0[0]) * tension) / 3, p1[1] + ((p2[1] - p0[1]) * tension) / 3];
    const c2 = [p2[0] - ((p3[0] - p1[0]) * tension) / 3, p2[1] - ((p3[1] - p1[1]) * tension) / 3];
    d += ` C ${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d} Z`;
}

function Silhouette({ pos }: { pos: number }) {
  const id = useId();
  const xs = largeurs(pos);
  const droite: Array<[number, number]> = xs.map((x, i) => [AXE + x, Y[i]]);
  // Côté gauche = miroir, parcouru en sens inverse ; l'entrejambe (sur l'axe) n'est pas doublé.
  const gauche: Array<[number, number]> = xs
    .slice(0, -1)
    .map((x, i): [number, number] => [AXE - x, Y[i]])
    .reverse();
  const corps = courbeFermee([...droite, ...gauche]);
  const tete = interp(TETE, pos);
  const epaules = xs[4];
  const taille = xs[19];
  return (
    <svg viewBox={`0 0 ${LARGEUR} 420`} className="h-[min(30dvh,250px)] w-auto" role="img" aria-hidden>
      <defs>
        <linearGradient id={`${id}-corps`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--text-primary)" stopOpacity="1" />
          <stop offset="0.75" stopColor="var(--text-primary)" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--text-primary)" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id={`${id}-halo`} cx="0.5" cy="0.42" r="0.55">
          <stop offset="0" stopColor="var(--action-primary)" stopOpacity="0.3" />
          <stop offset="1" stopColor="var(--action-primary)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-sol`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--action-primary)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--action-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Halo derrière le corps et ombre au sol : la silhouette est posée, pas flottante. */}
      <ellipse cx={AXE} cy={190} rx={100} ry={190} fill={`url(#${id}-halo)`} />
      <ellipse cx={AXE} cy={398} rx={46 + taille * 0.6} ry={9} fill={`url(#${id}-sol)`} />
      {/* Repères de mesure : épaules et taille, ils suivent la silhouette. */}
      <g stroke="var(--action-primary)" strokeWidth={1} strokeDasharray="2 4" opacity={0.7}>
        <line x1={AXE - epaules - 14} y1={92} x2={AXE + epaules + 14} y2={92} />
        <line x1={AXE - taille - 14} y1={172} x2={AXE + taille + 14} y2={172} />
      </g>
      <g fill={`url(#${id}-corps)`}>
        <ellipse cx={AXE} cy={27} rx={tete} ry={23} />
        <path d={corps} />
      </g>
    </svg>
  );
}

type Props = { valeur: Morpho | null | undefined; onChange: (m: Morpho) => void };

/** Largeur du pouce du curseur (px) : sa course s'arrête à une demi-largeur de chaque bord, comme un curseur natif. */
const POUCE = 32;

export function CurseurMorpho({ valeur, onChange }: Props) {
  const max = CHOIX_MORPHO.length - 1;
  const index = valeur ? CHOIX_MORPHO.findIndex((x) => x.id === valeur) : -1;
  // Position continue pendant le glissement ; sans choix, la silhouette part du repère « athlétique ».
  const [pos, setPos] = useState(index >= 0 ? index : 1);
  const [glisse, setGlisse] = useState(false);
  const proche = Math.round(pos);
  const choix = index >= 0 ? CHOIX_MORPHO[proche] : null;
  const caler = () => {
    setGlisse(false);
    setPos((v) => Math.round(v));
  };
  const gauche = (p: number) => `calc(${POUCE / 2}px + (100% - ${POUCE}px) * ${p / max})`;

  return (
    <div className="flex flex-col gap-[var(--stack-sm)]">
      <div className="relative flex flex-col items-center overflow-hidden rounded-[var(--radius-card-hero)] border border-line-subtle bg-surface-container-default pb-[var(--inset-md)] pt-[var(--inset-sm)]">
        <span className="kv-overline absolute left-[var(--inset-md)] top-[var(--inset-md)]">Silhouette</span>
        <span className="kv-mono absolute right-[var(--inset-md)] top-[var(--inset-md)]">
          {String(proche + 1).padStart(2, "0")} / {String(max + 1).padStart(2, "0")}
        </span>
        <Silhouette pos={pos} />
        <div className="mt-[var(--stack-xs)] px-[var(--inset-md)] text-center" aria-live="polite">
          <p className="type-title-lg">{choix ? choix.titre : "Glisse pour choisir"}</p>
          <p className="type-body-sm text-fg-secondary">{choix ? choix.aide : "Prends la silhouette la plus proche de la tienne."}</p>
        </div>
      </div>

      <div>
        {/* Curseur : piste, repères et pouce dessinés ; l'input natif (invisible) par-dessus porte le geste et l'accessibilité. */}
        <div className="relative h-[var(--control-lg)]">
          <div className="absolute inset-x-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-data-track" />
          <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-action-primary" style={{ width: gauche(pos) }} />
          {CHOIX_MORPHO.map((o, i) => (
            <span
              key={o.id}
              aria-hidden
              className={`absolute top-1/2 h-3 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${i <= pos ? "bg-fg-on-brand opacity-60" : "bg-fg-tertiary"}`}
              style={{ left: gauche(i) }}
            />
          ))}
          <span
            aria-hidden
            className={`absolute top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-action-primary ring-4 ring-surface-page ${
              glisse ? "scale-110" : "transition-[left,transform] duration-200"
            }`}
            style={{ left: gauche(pos), width: POUCE, height: POUCE }}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-fg-on-brand" />
          </span>
          <input
            type="range"
            min={0}
            max={max}
            step={0.01}
            value={pos}
            onChange={(e) => {
              const v = Number(e.target.value);
              setPos(v);
              onChange(CHOIX_MORPHO[Math.round(v)].id);
            }}
            onPointerDown={() => setGlisse(true)}
            onPointerUp={caler}
            onPointerCancel={caler}
            onKeyUp={caler}
            onBlur={caler}
            aria-label="Morphologie"
            aria-valuetext={choix?.titre ?? "Non choisie"}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <div className="relative mt-[var(--stack-2xs)] h-[var(--control-min)]">
          {CHOIX_MORPHO.map((o, i) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                setPos(i);
                onChange(o.id);
              }}
              aria-pressed={valeur === o.id}
              style={{ left: gauche(i) }}
              className={`absolute top-0 flex h-full items-center whitespace-nowrap type-label-md ${
                i === 0 ? "-translate-x-[16px]" : i === max ? "-translate-x-[calc(100%-16px)]" : "-translate-x-1/2"
              } ${valeur === o.id ? "text-fg-primary" : "text-fg-tertiary"}`}
            >
              {o.titre}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
