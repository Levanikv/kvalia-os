import type { SVGProps } from "react";

/**
 * Icônes du design system (Figma « Icon/* », grille 24, trait 1,8, couleur = currentColor).
 * Mêmes tracés que les composants Figma : à utiliser là où une maquette les montre (Home Sport, barre de l'app).
 */
type Forme =
  | ["path", { d: string; plein?: boolean }]
  | ["rect", { x: number; y: number; width: number; height: number; rx: number }]
  | ["circle", { cx: number; cy: number; r: number }];

const TRACES: Record<string, Forme[]> = {
  home: [["path", { d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" }]],
  quotidien: [
    ["rect", { x: 3, y: 3, width: 18, height: 18, rx: 6 }],
    ["path", { d: "m8 12 3 3 5-6" }],
  ],
  sport: [["path", { d: "M13 2 4 14h7l-1 8 9-12h-7z" }]],
  finances: [
    ["rect", { x: 3, y: 6, width: 18, height: 14, rx: 4 }],
    ["path", { d: "M3 10.5h18M15.5 15h2.5" }],
  ],
  entreprise: [
    ["rect", { x: 3, y: 7, width: 18, height: 13, rx: 4 }],
    ["path", { d: "M9 7V5.5A2.5 2.5 0 0 1 11.5 3h1A2.5 2.5 0 0 1 15 5.5V7M3 13h18" }],
  ],
  plus: [["path", { d: "M12 5v14M5 12h14" }]],
  close: [["path", { d: "M6 6l12 12M18 6 6 18" }]],
  check: [["path", { d: "m5 12 5 5 9-10" }]],
  "arrow-right": [["path", { d: "M5 12h14M13 6l6 6-6 6" }]],
  "chevron-right": [["path", { d: "M9 6l6 6-6 6" }]],
  "chevron-left": [["path", { d: "M15 6l-6 6 6 6" }]],
  play: [["path", { d: "M8 5v14l11-7z", plein: true }]],
  target: [
    ["circle", { cx: 12, cy: 12, r: 8.5 }],
    ["circle", { cx: 12, cy: 12, r: 4.5 }],
  ],
  agent: [["path", { d: "M12 2c.7 5.3 3.7 8.3 10 10-6.3 1.7-9.3 4.7-10 10-.7-5.3-3.7-8.3-10-10 6.3-1.7 9.3-4.7 10-10z", plein: true }]],
  menu: [["path", { d: "M4 7h16M4 12h16M4 17h10" }]],
  nutrition: [
    [
      "path",
      {
        d: "M12 7.5c-1.6-1.3-5.2-1.6-6.7 1.1-1.6 2.9-.1 8.6 2.4 10.9 1.3 1.2 2.7.8 4.3.2 1.6.6 3 1 4.3-.2 2.5-2.3 4-8 2.4-10.9C17.2 5.9 13.6 6.2 12 7.5zM12 7.5c0-2.2 1.1-3.8 3.2-4.3",
      },
    ],
  ],
};

export type NomIconeDs = keyof typeof TRACES;
export const estIconeDs = (n: string): n is NomIconeDs => n in TRACES;

type Props = { nom: string; taille?: number; epaisseur?: number } & Omit<SVGProps<SVGSVGElement>, "name">;

export function IconeDs({ nom, taille = 24, epaisseur = 1.8, ...rest }: Props) {
  const formes = TRACES[nom] ?? TRACES.plus;
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={epaisseur}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {formes.map(([t, p], i) => {
        if (t === "path") return <path key={i} d={p.d} {...(p.plein ? { fill: "currentColor", stroke: "none" } : {})} />;
        if (t === "rect") return <rect key={i} {...p} />;
        return <circle key={i} {...p} />;
      })}
    </svg>
  );
}
