"use client";
import type { ReactNode } from "react";
import { Icon } from "./Icon";

type Props = {
  valeur: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Nom du champ pour les lecteurs d'écran. */
  label: string;
  /** Bouton à droite du champ (filtres), hors de la zone de saisie. */
  apres?: ReactNode;
};

/** Champ de recherche des listes (exercices, recettes) : une pilule, la loupe, la croix pour effacer, et à côté le bouton des filtres. */
export function ChampRecherche({ valeur, onChange, placeholder, label, apres }: Props) {
  return (
    <div className="flex items-center gap-[var(--inline-sm)]">
      <label className="kv-field-box min-w-0 flex-1 !rounded-[var(--radius-control)]">
        <Icon name="search" size={22} className="shrink-0 text-icon-tertiary" />
        <input
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={label}
          enterKeyHint="search"
          className="kv-field-input"
        />
        {valeur && (
          <button type="button" onClick={() => onChange("")} aria-label="Effacer la recherche" className="shrink-0 text-icon-tertiary">
            <Icon name="close" size={20} />
          </button>
        )}
      </label>
      {apres}
    </div>
  );
}

/** Bouton « Filtres » à côté du champ : ouvre la feuille des filtres ; une pastille compte ceux qui sont actifs. */
export function BoutonFiltres({ actifs, onClick, label = "Filtres" }: { actifs: number; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={actifs ? `${label} · ${actifs} actif${actifs > 1 ? "s" : ""}` : label}
      className={`relative flex h-[var(--control-lg)] w-[var(--control-lg)] shrink-0 items-center justify-center rounded-full border ${
        actifs ? "border-transparent bg-action-primary text-fg-on-brand" : "border-line-default bg-surface-container-default text-fg-primary"
      }`}
    >
      <Icon name="tune" size={22} />
      {actifs > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-surface-container-inverse px-1 text-[11px] font-bold text-fg-inverse">
          {actifs}
        </span>
      )}
    </button>
  );
}
