"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { AlimentSortie, RecetteSortie, Repas, RepasPrecedent, Suggestion } from "@kvalia/core";
import { ChampRecherche } from "@/components/ChampRecherche";
import { Icon } from "@/components/Icon";
import { Segments } from "@/components/Segments";
import { Toast } from "@/components/Toast";
import { useAjout } from "../Ajout";
import { ajouterAuJournalAction, repeterRepasAction } from "../actions";
import { CarteRecette } from "../recettes/CarteRecette";

/**
 * Corps de la page « Ajouter à un repas » : trois sources, une seule à l'écran (segmented control).
 * Pour toi → ajout direct d'une suggestion (portions déjà calculées pour le budget du repas) ;
 * Recettes → la fiche de la recette (portions à choisir) ; Aliments → la feuille d'ajout (`useAjout`).
 */
type Source = "pour_toi" | "recettes" | "aliments";
type Props = {
  jour: string;
  /** Où revenir une fois le repas noté. */
  retour: string;
  repas: Repas;
  libelle: string;
  /** Ce qui est déjà noté pour ce repas. */
  dejaKcal: number;
  message: string;
  budget: number;
  suggestions: Suggestion[];
  recettes: RecetteSortie[];
  recents: AlimentSortie[];
  precedent?: RepasPrecedent;
};

const SOURCES = [
  { cle: "pour_toi", label: "Pour toi" },
  { cle: "recettes", label: "Recettes" },
  { cle: "aliments", label: "Aliments" },
] as const;
const nf = (n: number) => n.toLocaleString("fr-FR");
const portionsTexte = (p: number) => (p === 1 ? "1 portion" : p === 0.5 ? "½ portion" : `${String(p).replace(".", ",")} portions`);
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function AjouterRepas({ jour, retour, repas, libelle, dejaKcal, message, budget, suggestions, recettes, recents, precedent }: Props) {
  const router = useRouter();
  const { ouvrir } = useAjout();
  const [source, setSource] = useState<Source>("pour_toi");
  const [q, setQ] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, start] = useTransition();

  /** Note puis revient au journal du jour, où la ligne vient d'apparaître. */
  const noter = (f: () => Promise<{ ok: boolean; erreur?: string }>) =>
    start(async () => {
      const r = await f();
      if (!r.ok) return setErreur(r.erreur ?? "Action impossible.");
      router.push(retour);
      router.refresh();
    });
  const t = q.trim().toLowerCase();
  const visibles = recettes
    .filter((r) => !t || r.nom.toLowerCase().includes(t))
    .sort(
      (a, b) => Number(b.perso || b.utilisations > 0) - Number(a.perso || a.utilisations > 0) || b.utilisations - a.utilisations || a.nom.localeCompare(b.nom),
    );
  const lienRecette = (id: string) => `/nutrition/recettes/${id}?repas=${repas}&jour=${jour}`;

  return (
    <div className="flex flex-col gap-[var(--stack-lg)]">
      <header className="flex flex-col gap-[var(--stack-xs)] px-[var(--inline-xs)]">
        <h2 className="type-display-md">{libelle}</h2>
        <p className="type-body-md text-fg-secondary">
          {dejaKcal > 0 ? `${nf(dejaKcal)} kcal déjà notées · ` : ""}
          {budget >= 80
            ? `${dejaKcal > 0 ? "vise" : "Vise"} environ ${nf(budget)} kcal`
            : dejaKcal > 0
              ? "tu es à ta cible du jour"
              : "Tu es à ta cible du jour"}
        </p>
      </header>

      {precedent && (
        <button
          type="button"
          disabled={occupe}
          onClick={() => noter(() => repeterRepasAction(jour, repas))}
          className="tap flex items-center gap-[var(--inline-md)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-sunken text-fg-secondary">
            <Icon name="replay" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block type-title-sm">Comme la dernière fois</span>
            <span className="block truncate type-body-sm text-fg-secondary">{precedent.libelles.map((l) => l.split(" · ")[0]).join(", ")}</span>
          </span>
          <span className="shrink-0 type-label-lg tabular-nums">{nf(precedent.kcal)} kcal</span>
        </button>
      )}

      <Segments items={SOURCES} actif={source} label="D’où vient ce repas" onChoisir={setSource} />

      {source === "pour_toi" && (
        <section className="cascade flex flex-col gap-[var(--stack-sm)]" aria-label="Suggestions selon tes calories">
          <p className="flex items-start gap-[var(--inline-sm)] px-[var(--inline-xs)] type-body-sm text-fg-secondary">
            <Icon name="auto_awesome" size={18} className="mt-0.5 shrink-0 text-fg-brand" />
            <span>{message}</span>
          </p>
          {suggestions.map((s) => (
            <CarteRecette
              key={s.id}
              recette={s}
              href={lienRecette(s.id)}
              kcal={s.kcal}
              detail={`${portionsTexte(s.portions)} · ${majuscule(s.raison)}`}
              action={
                <button
                  type="button"
                  disabled={occupe}
                  onClick={() => noter(() => ajouterAuJournalAction({ jour, repas, recette_id: s.id, portions: s.portions }))}
                  aria-label={`Ajouter ${s.nom} à ${libelle.toLowerCase()}`}
                  className="kv-iconbtn kv-iconbtn-primary shrink-0"
                >
                  <Icon name="add" size={22} />
                </button>
              }
            />
          ))}
          {suggestions.length === 0 && (
            <Vide>Aucune recette ne tient dans ce qu’il te reste. Regarde du côté des aliments : un fruit, un yaourt, une saisie rapide.</Vide>
          )}
        </section>
      )}

      {source === "recettes" && (
        <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Recettes pour ce repas">
          <ChampRecherche valeur={q} onChange={setQ} placeholder="Chercher une recette" label="Chercher une recette" />
          {visibles.map((r) => (
            <CarteRecette
              key={r.id}
              recette={r}
              href={lienRecette(r.id)}
              etiquette={r.utilisations > 0 ? `Déjà notée ${r.utilisations} fois` : r.perso ? "Ta recette" : undefined}
            />
          ))}
          {visibles.length === 0 && <Vide>Aucune recette pour cette recherche.</Vide>}
        </section>
      )}

      {source === "aliments" && (
        <section className="flex flex-col gap-[var(--stack-md)]" aria-label="Aliments">
          <button type="button" onClick={() => ouvrir({ repas, jour })} className="kv-field-box w-full !rounded-[var(--radius-control)] text-left">
            <Icon name="search" size={22} className="shrink-0 text-icon-tertiary" />
            <span className="type-body-md text-fg-tertiary">Skyr, riz basmati, un produit de marque…</span>
          </button>
          <div className="grid grid-cols-3 gap-[var(--inline-md)]">
            {(
              [
                ["scan", "barcode_scanner", "Scanner"],
                ["photo", "photo_camera", "Photo"],
                ["libre", "bolt", "Saisie rapide"],
              ] as const
            ).map(([mode, icone, nom]) => (
              <button
                key={mode}
                type="button"
                onClick={() => ouvrir({ repas, jour, mode })}
                className="tap flex flex-col items-center gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-xs)] py-[var(--inset-md)]"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
                  <Icon name={icone} size={24} />
                </span>
                <span className="type-label-lg">{nom}</span>
              </button>
            ))}
          </div>
          {recents.length > 0 && (
            <div className="flex flex-col gap-[var(--stack-sm)]">
              <h3 className="px-[var(--inline-xs)] type-title-md">Récents</h3>
              <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
                {recents.map((a) => (
                  <li key={a.id} className="border-b border-line-subtle last:border-b-0">
                    <button
                      type="button"
                      onClick={() => ouvrir({ repas, jour, aliment: a })}
                      className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate type-title-sm">{a.nom}</span>
                        <span className="block truncate type-body-sm text-fg-secondary">
                          {[a.marque, `${nf(a.kcal)} kcal / 100 g`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <Icon name="add_circle" size={24} className="shrink-0 text-fg-brand" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
      <Toast message={erreur} onFermer={() => setErreur(null)} bas="var(--stack-lg)" />
    </div>
  );
}

function Vide({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
      {children}
    </p>
  );
}
