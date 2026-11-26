"use client";
import { useState } from "react";
import { LIBELLES_REPAS, REPAS, type RecetteSortie, type Repas } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { BoutonFiltres, ChampRecherche } from "@/components/ChampRecherche";
import { Icon } from "@/components/Icon";
import { Puces } from "@/components/Puces";
import { Segments } from "@/components/Segments";
import { CarteRecette } from "./CarteRecette";
import { LIBELLES_TAGS } from "./tags";

/**
 * Liste des recettes. Même grammaire de filtres que la bibliothèque d'exercices : « Toutes / Mes recettes » en
 * segmented control, la recherche, une rangée de puces (le repas), et les usages dans la feuille « Filtres ».
 * Tri : ce qui sert l'objectif du programme sportif d'abord.
 */
type Props = { recettes: RecetteSortie[]; objectif: string | null; repasInitial: Repas | null };
type Vue = "toutes" | "miennes";

const VUES = [
  { cle: "toutes", label: "Toutes" },
  { cle: "miennes", label: "Mes recettes" },
] as const;
const USAGES = ["avant_seance", "apres_seance", "riche_proteines", "leger", "rapide", "vegetarien"];
/** Étiquettes mises en avant selon l'objectif du programme actif. */
const POUR_OBJECTIF: Record<string, string[]> = {
  perte_de_gras: ["seche", "leger"],
  hypertrophie: ["masse", "riche_proteines"],
  force: ["masse", "riche_proteines"],
  endurance: ["avant_seance"],
};

export function ListeRecettes({ recettes, objectif, repasInitial }: Props) {
  const [vue, setVue] = useState<Vue>("toutes");
  const [q, setQ] = useState("");
  const [repas, setRepas] = useState<Repas | null>(repasInitial);
  const [usages, setUsages] = useState<string[]>([]);
  const [feuille, setFeuille] = useState(false);
  const pour = objectif ? POUR_OBJECTIF[objectif] : undefined;
  const petit = repas === "collation" || repas === "encas";
  const t = q.trim().toLowerCase();
  const visibles = recettes
    .filter((r) => vue === "toutes" || r.perso || r.utilisations > 0)
    .filter((r) => !t || r.nom.toLowerCase().includes(t))
    .filter((r) => !repas || r.repas.includes(repas) || (petit && (r.repas.includes("collation") || r.repas.includes("encas"))))
    .filter((r) => usages.every((u) => r.tags.includes(u)))
    .map((r) => ({ r, pertinence: pour ? pour.filter((x) => r.tags.includes(x)).length : 0 }))
    .sort((a, b) => (vue === "miennes" ? b.r.utilisations - a.r.utilisations : 0) || b.pertinence - a.pertinence || a.r.nom.localeCompare(b.r.nom));
  const basculer = (u: string) => setUsages((x) => (x.includes(u) ? x.filter((y) => y !== u) : [...x, u]));

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <Segments items={VUES} actif={vue} label="Quelles recettes" onChoisir={setVue} />
      <ChampRecherche
        valeur={q}
        onChange={setQ}
        placeholder="Chercher une recette"
        label="Chercher une recette"
        apres={<BoutonFiltres actifs={usages.length} onClick={() => setFeuille(true)} />}
      />
      <Puces label="Repas" items={REPAS.map((r) => ({ cle: r, label: LIBELLES_REPAS[r] }))} actif={repas} onChoisir={setRepas} />

      <div className="flex min-h-[var(--control-sm)] flex-wrap items-center gap-[var(--inline-sm)] px-[var(--inline-xs)]">
        <span className="type-label-md text-fg-secondary">
          {visibles.length} recette{visibles.length > 1 ? "s" : ""}
          {pour && vue === "toutes" ? " · triées pour ton programme" : ""}
        </span>
        {usages.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => basculer(u)}
            aria-label={`Retirer le filtre ${LIBELLES_TAGS[u]}`}
            className="flex h-[var(--control-sm)] items-center gap-[var(--inline-xs)] rounded-full bg-surface-container-brand-subtle pl-[var(--inset-sm)] pr-[var(--inset-xs)] type-label-md text-fg-brand"
          >
            {LIBELLES_TAGS[u]}
            <Icon name="close" size={16} />
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
          {vue === "miennes" && !t && !repas && usages.length === 0
            ? "Tes recettes arrivent ici dès que tu en notes une au journal — ou demande à l’agent d’en créer une."
            : "Aucune recette pour ces filtres. Retire-en un."}
        </p>
      ) : (
        <ul className="flex flex-col gap-[var(--stack-sm)]">
          {visibles.map(({ r, pertinence }) => (
            <li key={r.id}>
              <CarteRecette
                recette={r}
                href={`/nutrition/recettes/${r.id}${repas ? `?repas=${repas}` : ""}`}
                etiquette={
                  vue === "miennes" ? (r.utilisations > 0 ? `Notée ${r.utilisations} fois` : "Ta recette") : pertinence > 0 ? "Pour ton programme" : undefined
                }
              />
            </li>
          ))}
        </ul>
      )}

      <BottomSheet
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        titre="Filtres"
        module="nutrition"
        pied={
          <div className="flex gap-[var(--inline-md)]">
            <button type="button" disabled={!usages.length} onClick={() => setUsages([])} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
              Tout effacer
            </button>
            <button type="button" onClick={() => setFeuille(false)} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.6]">
              <span className="kv-btn-label">
                Voir {visibles.length} recette{visibles.length > 1 ? "s" : ""}
              </span>
            </button>
          </div>
        }
      >
        <section className="flex flex-col gap-[var(--stack-sm)] pt-[var(--stack-xs)]">
          <h3 className="type-title-sm">Pour quoi ?</h3>
          <div className="flex flex-wrap gap-[var(--inline-sm)]">
            {USAGES.map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={usages.includes(u)}
                onClick={() => basculer(u)}
                className={`kv-chip ${usages.includes(u) ? "is-on" : ""}`}
              >
                {LIBELLES_TAGS[u]}
              </button>
            ))}
          </div>
        </section>
      </BottomSheet>
    </div>
  );
}
