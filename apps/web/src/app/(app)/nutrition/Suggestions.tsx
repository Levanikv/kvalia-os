"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LIBELLES_REPAS, REPAS, type Repas, type Suggestion } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { ajouterAuJournalAction, suggererAction } from "./actions";

/**
 * « À manger maintenant » : selon ce qu'il reste aujourd'hui, le repas du moment et la séance du jour, les recettes
 * qui vont le mieux (règles : suggererRepas dans le noyau). On change de repas d'une puce, on ajoute d'un geste.
 */
type Donnees = { repas: Repas; budget_kcal: number; message: string; suggestions: Suggestion[] };
type Props = { jour: string; initial: Donnees; modifiable: boolean };

const nf = (n: number) => n.toLocaleString("fr-FR");
const BAS_TOAST = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--control-xl) + var(--stack-md))";
const portionsTexte = (p: number) => (p === 1 ? "" : p === 0.5 ? "½ portion · " : `${String(p).replace(".", ",")} portions · `);

export function Suggestions({ jour, initial, modifiable }: Props) {
  const router = useRouter();
  const [d, setD] = useState<Donnees>(initial);
  const [charge, chargerRepas] = useTransition();
  const [ajout, ajouter] = useTransition();
  const [toast, setToast] = useState<string | null>(null);

  const changer = (repas: Repas) =>
    chargerRepas(async () => {
      setD((x) => ({ ...x, repas }));
      const r = await suggererAction(jour, repas);
      if (r.ok) setD({ repas: r.valeur.repas, budget_kcal: r.valeur.budget_kcal, message: r.valeur.message, suggestions: r.valeur.suggestions });
    });
  const manger = (s: Suggestion) =>
    ajouter(async () => {
      const r = await ajouterAuJournalAction({ jour, repas: d.repas, recette_id: s.id, portions: s.portions });
      if (!r.ok) return setToast(r.erreur);
      setToast(`${s.nom} ajouté · ${nf(r.valeur.kcal)} kcal`);
      router.refresh();
      const maj = await suggererAction(jour, d.repas);
      if (maj.ok) setD({ repas: maj.valeur.repas, budget_kcal: maj.valeur.budget_kcal, message: maj.valeur.message, suggestions: maj.valeur.suggestions });
    });

  return (
    <section
      className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card-hero)] bg-surface-container-brand-subtle p-[var(--inset-md)] shadow-card"
      aria-label="Suggestions"
    >
      <div className="flex items-start justify-between gap-[var(--inline-md)] px-[var(--inline-xs)]">
        <div>
          <p className="kv-overline text-fg-brand">À manger maintenant</p>
          <h2 className="type-title-lg">
            {LIBELLES_REPAS[d.repas]}
            {d.budget_kcal >= 80 && <span className="text-fg-secondary"> · ≈ {nf(d.budget_kcal)} kcal</span>}
          </h2>
        </div>
        <Icon name="auto_awesome" size={22} className="mt-1 shrink-0 text-fg-brand" />
      </div>
      <div className="-mx-[var(--inset-md)] flex gap-[var(--inline-sm)] overflow-x-auto px-[var(--inset-md)] pb-1" role="radiogroup" aria-label="Repas">
        {REPAS.map((r) => (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={d.repas === r}
            onClick={() => changer(r)}
            className={`kv-chip shrink-0 ${d.repas === r ? "is-on" : ""}`}
          >
            {LIBELLES_REPAS[r]}
          </button>
        ))}
      </div>
      <p className="px-[var(--inline-xs)] type-body-sm text-fg-secondary" aria-live="polite">
        {charge ? "Je regarde ce qui convient…" : d.message}
      </p>
      {d.suggestions.length > 0 && (
        <ul className={`flex flex-col gap-[var(--stack-xs)] ${charge ? "opacity-50" : ""}`}>
          {d.suggestions.map((s) => (
            <li key={s.id} className="flex items-center gap-[var(--inline-md)] rounded-[var(--radius-tile)] bg-surface-container-default p-[var(--inset-sm)]">
              <Link href={`/nutrition/recettes/${s.id}?repas=${d.repas}&jour=${jour}`} className="min-w-0 flex-1">
                <span className="block truncate type-title-sm">{s.nom}</span>
                <span className="block truncate kv-mono">
                  {portionsTexte(s.portions)}
                  {nf(s.kcal)} kcal · P {s.prot} g · G {s.gluc} · L {s.lip}
                </span>
                <span className="mt-[var(--stack-2xs)] flex items-center gap-[var(--inline-xs)] type-body-sm text-fg-brand">
                  <Icon name="check" size={14} /> {s.raison.charAt(0).toUpperCase() + s.raison.slice(1)}
                </span>
              </Link>
              {modifiable && (
                <button
                  type="button"
                  onClick={() => manger(s)}
                  disabled={ajout}
                  aria-label={`Ajouter ${s.nom} au journal`}
                  className="kv-iconbtn kv-iconbtn-primary shrink-0"
                >
                  <Icon name="add" size={22} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Link
        href={`/nutrition/recettes?repas=${d.repas}`}
        className="flex items-center justify-center gap-[var(--inline-xs)] py-[var(--stack-xs)] type-label-md text-fg-link"
      >
        Toutes les recettes <Icon name="chevron_right" size={18} />
      </Link>
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </section>
  );
}
