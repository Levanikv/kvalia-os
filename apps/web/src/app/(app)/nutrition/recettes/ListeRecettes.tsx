"use client";
import Link from "next/link";
import { useState } from "react";
import { LIBELLES_REPAS, REPAS, type RecetteSortie, type Repas } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { LIBELLES_TAGS } from "./tags";

/** Liste des recettes : filtre par repas, par usage, tri selon l'objectif du programme sportif. */
type Props = { recettes: RecetteSortie[]; objectif: string | null; repasInitial: Repas | null };

const USAGES = ["avant_seance", "apres_seance", "riche_proteines", "leger", "rapide", "vegetarien"];
/** Étiquettes mises en avant selon l'objectif du programme actif. */
const POUR_OBJECTIF: Record<string, { tags: string[]; texte: string }> = {
  perte_de_gras: { tags: ["seche", "leger"], texte: "Ton programme vise la perte de gras : les recettes rassasiantes et légères sont en tête." },
  hypertrophie: {
    tags: ["masse", "riche_proteines"],
    texte: "Ton programme vise la prise de muscle : les recettes denses et riches en protéines sont en tête.",
  },
  force: { tags: ["masse", "riche_proteines"], texte: "Ton programme vise la force : les recettes denses et riches en protéines sont en tête." },
  endurance: { tags: ["avant_seance"], texte: "Ton programme vise l’endurance : les recettes riches en glucides sont en tête." },
};

const nf = (n: number) => n.toLocaleString("fr-FR");

export function ListeRecettes({ recettes, objectif, repasInitial }: Props) {
  const [repas, setRepas] = useState<Repas | null>(repasInitial);
  const [usage, setUsage] = useState<string | null>(null);
  const pour = objectif ? POUR_OBJECTIF[objectif] : undefined;
  const petit = repas === "collation" || repas === "encas";
  const visibles = recettes
    .filter((r) => !repas || r.repas.includes(repas) || (petit && (r.repas.includes("collation") || r.repas.includes("encas"))))
    .filter((r) => !usage || r.tags.includes(usage))
    .map((r) => ({ r, pertinence: pour ? pour.tags.filter((t) => r.tags.includes(t)).length : 0 }))
    .sort((a, b) => b.pertinence - a.pertinence || a.r.nom.localeCompare(b.r.nom));

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <div className="-mx-[var(--page-gutter)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--page-gutter)] pb-1" role="radiogroup" aria-label="Repas">
        <button type="button" role="radio" aria-checked={!repas} onClick={() => setRepas(null)} className={`kv-chip shrink-0 ${!repas ? "is-on" : ""}`}>
          Tout
        </button>
        {REPAS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={repas === r}
            onClick={() => setRepas(r)}
            className={`kv-chip shrink-0 ${repas === r ? "is-on" : ""}`}
          >
            {LIBELLES_REPAS[r]}
          </button>
        ))}
      </div>
      <div className="-mx-[var(--page-gutter)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--page-gutter)] pb-1" aria-label="Usage">
        {USAGES.map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={usage === t}
            onClick={() => setUsage(usage === t ? null : t)}
            className={`kv-chip shrink-0 ${usage === t ? "is-on" : ""}`}
          >
            {LIBELLES_TAGS[t]}
          </button>
        ))}
      </div>
      {pour && (
        <p className="flex items-start gap-[var(--inline-sm)] rounded-[var(--radius-input)] bg-surface-container-brand-subtle p-[var(--inset-sm)] type-body-sm">
          <Icon name="fitness_center" size={18} className="mt-0.5 shrink-0 text-fg-brand" />
          <span>{pour.texte}</span>
        </p>
      )}
      <p className="px-[var(--inline-xs)] kv-overline">
        {visibles.length} recette{visibles.length > 1 ? "s" : ""}
      </p>
      {visibles.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
          Aucune recette pour ces filtres. Retire-en un.
        </p>
      ) : (
        <ul className="flex flex-col gap-[var(--stack-sm)]">
          {visibles.map(({ r, pertinence }) => (
            <li key={r.id}>
              <Link
                href={`/nutrition/recettes/${r.id}${repas ? `?repas=${repas}` : ""}`}
                className="flex flex-col gap-[var(--stack-xs)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] active:opacity-90"
              >
                <div className="flex items-start justify-between gap-[var(--inline-md)]">
                  <h2 className="type-title-sm">{r.nom}</h2>
                  <span className="shrink-0 text-right">
                    <span className="type-title-md tabular-nums">{nf(r.kcal)}</span> <span className="kv-mono">kcal</span>
                  </span>
                </div>
                <p className="kv-mono">
                  P {r.prot} g · G {r.gluc} g · L {r.lip} g{r.temps_min ? ` · ${r.temps_min} min` : ""}
                </p>
                <div className="flex flex-wrap gap-[var(--inline-xs)]">
                  {pertinence > 0 && <span className="kv-tag kv-tag-brand">Pour ton programme</span>}
                  {r.tags
                    .filter((t) => ["avant_seance", "apres_seance", "riche_proteines", "leger", "vegetarien"].includes(t))
                    .slice(0, 3)
                    .map((t) => (
                      <span key={t} className="kv-tag kv-tag-neutral">
                        {LIBELLES_TAGS[t]}
                      </span>
                    ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
