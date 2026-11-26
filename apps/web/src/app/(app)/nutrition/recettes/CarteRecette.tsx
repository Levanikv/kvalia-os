import Link from "next/link";
import type { ReactNode } from "react";
import type { RecetteSortie } from "@kvalia/core";
import { illustrationRecette } from "../donnees";

const nf = (n: number) => n.toLocaleString("fr-FR");
const MACROS = [
  { cle: "prot", lettre: "P", couleur: "var(--nutrition-data-protein)" },
  { cle: "gluc", lettre: "G", couleur: "var(--nutrition-data-carbs)" },
  { cle: "lip", lettre: "L", couleur: "var(--nutrition-data-fat)" },
] as const;

type Props = {
  recette: RecetteSortie;
  href: string;
  /** Calories affichées (portions d'une suggestion) ; par défaut une portion. */
  kcal?: number;
  /** Ligne sous le nom, à la place du temps de préparation (la raison d'une suggestion). */
  detail?: string;
  /** Étiquette au-dessus du nom (« Pour ton programme », « Déjà mangée »). */
  etiquette?: string;
  /** Bouton à droite (ajout direct). */
  action?: ReactNode;
};

/**
 * Une recette dans une liste (Recettes, page d'ajout) : l'illustration de son repas, le nom, les calories en gros,
 * et les trois macros repérées par leur couleur — les mêmes que dans le bilan.
 */
export function CarteRecette({ recette: r, href, kcal, detail, etiquette, action }: Props) {
  const precision = detail ?? (r.temps_min ? `${r.temps_min} min` : null);
  return (
    <div className="flex items-center gap-[var(--inline-md)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-sm)]">
      <Link href={href} className="flex min-w-0 flex-1 items-center gap-[var(--inline-lg)]">
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[var(--radius-thumb)] bg-surface-container-sunken text-[28px] leading-none"
        >
          {illustrationRecette(r.nom, r.repas)}
        </span>
        <span className="min-w-0 flex-1">
          {etiquette && <span className="block truncate kv-overline text-fg-brand">{etiquette}</span>}
          <span className="line-clamp-2 type-title-sm">{r.nom}</span>
          <span className="mt-[var(--stack-2xs)] flex items-center gap-x-[var(--inline-md)] type-body-sm text-fg-secondary">
            {MACROS.map((m) => (
              <span key={m.cle} className="flex items-center gap-1 tabular-nums">
                <span className="h-2 w-2 rounded-full" style={{ background: m.couleur }} aria-hidden />
                {m.lettre} {r[m.cle]}
              </span>
            ))}
          </span>
          {precision && <span className="block truncate type-body-sm text-fg-tertiary">{precision}</span>}
        </span>
        <span className="shrink-0 text-right">
          <span className="block type-title-md tabular-nums">{nf(kcal ?? r.kcal)}</span>
          <span className="block kv-mono">kcal</span>
        </span>
      </Link>
      {action}
    </div>
  );
}
