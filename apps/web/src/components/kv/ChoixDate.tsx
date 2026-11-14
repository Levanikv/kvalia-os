"use client";
import { useState } from "react";
import { BottomSheet } from "../BottomSheet";
import { Icon } from "../Icon";

type Props = {
  /** Jour choisi (YYYY-MM-DD). */
  valeur: string;
  onChange: (jour: string) => void;
  /** Aujourd'hui côté utilisateur (Europe/Paris) : premier jour possible. */
  aujourdhui: string;
  /** Dernier jour possible (par défaut aujourd'hui + 120 jours). */
  max?: string;
  /** Titre de la feuille calendrier. */
  titre?: string;
  /** Raccourcis proposés (par défaut : aujourd'hui, demain, lundi prochain). */
  raccourcis?: Array<{ jour: string; label: string }>;
};

const MOIS_COURT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" };
const JOURS_ENTETE = ["L", "M", "M", "J", "V", "S", "D"];

function decaler(jour: string, n: number) {
  const d = new Date(jour + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function lundiProchain(jour: string) {
  const j = new Date(jour + "T12:00:00Z").getUTCDay();
  return decaler(jour, j === 1 ? 7 : (8 - j) % 7);
}
const libelle = (jour: string, o: Intl.DateTimeFormatOptions) => new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", o);

/**
 * Choix d'une date de démarrage : raccourcis (Aujourd'hui · Demain · Lundi) + « Autre date » qui ouvre un
 * calendrier du mois (semaine du lundi au dimanche, aujourd'hui marqué, jours passés grisés).
 */
export function ChoixDate({ valeur, onChange, aujourdhui, max, titre = "Choisir une date", raccourcis }: Props) {
  const fin = max ?? decaler(aujourdhui, 120);
  const rapides = raccourcis ?? [
    { jour: aujourdhui, label: "Aujourd’hui" },
    { jour: decaler(aujourdhui, 1), label: "Demain" },
    { jour: lundiProchain(aujourdhui), label: `Lun. ${libelle(lundiProchain(aujourdhui), { day: "numeric" })}` },
  ];
  const autre = !rapides.some((r) => r.jour === valeur);
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="flex flex-col gap-[var(--stack-sm)]">
      <div className="grid grid-cols-4 gap-[var(--inline-xs)]" role="radiogroup" aria-label={titre}>
        {rapides.map((r) => (
          <button
            key={r.jour + r.label}
            type="button"
            role="radio"
            aria-checked={valeur === r.jour}
            onClick={() => onChange(r.jour)}
            className={`flex min-h-[var(--control-lg)] flex-col items-center justify-center rounded-[var(--radius-input)] border px-1 ${
              valeur === r.jour ? "border-transparent bg-surface-container-inverse text-fg-inverse" : "border-line-default bg-surface-container-default"
            }`}
          >
            <span className="type-label-md">{r.label}</span>
            <span className="font-mono text-[10px] opacity-70">{libelle(r.jour, { day: "numeric", month: "short" })}</span>
          </button>
        ))}
        <button
          type="button"
          role="radio"
          aria-checked={autre}
          onClick={() => setOuvert(true)}
          className={`flex min-h-[var(--control-lg)] flex-col items-center justify-center rounded-[var(--radius-input)] border px-1 ${
            autre ? "border-transparent bg-surface-container-inverse text-fg-inverse" : "border-line-default bg-surface-container-default"
          }`}
        >
          <Icon name="calendar_month" size={18} />
          <span className="font-mono text-[10px] opacity-80">{autre ? libelle(valeur, { day: "numeric", month: "short" }) : "Autre"}</span>
        </button>
      </div>
      <p className="px-[var(--inline-xs)] kv-mono">Début : {libelle(valeur, { weekday: "long", day: "numeric", month: "long" })}</p>

      <BottomSheet ouvert={ouvert} onFermer={() => setOuvert(false)} titre={titre}>
        <Calendrier
          valeur={valeur}
          min={aujourdhui}
          max={fin}
          onChoisir={(j) => {
            onChange(j);
            setOuvert(false);
          }}
        />
      </BottomSheet>
    </div>
  );
}

/** Grille d'un mois (lundi → dimanche) avec navigation mois précédent / suivant, bornée par min et max. */
export function Calendrier({ valeur, min, max, onChoisir }: { valeur: string; min: string; max: string; onChoisir: (jour: string) => void }) {
  const [mois, setMois] = useState(() => (valeur >= min ? valeur : min).slice(0, 7));
  const premier = mois + "-01";
  const decalage = (new Date(premier + "T12:00:00Z").getUTCDay() + 6) % 7; // lundi = 0
  const nbJours = new Date(Date.UTC(Number(mois.slice(0, 4)), Number(mois.slice(5, 7)), 0)).getUTCDate();
  const cases: Array<string | null> = [
    ...Array.from({ length: decalage }, () => null),
    ...Array.from({ length: nbJours }, (_, i) => `${mois}-${String(i + 1).padStart(2, "0")}`),
  ];
  const moisVoisin = (n: number) => {
    const d = new Date(premier + "T12:00:00Z");
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString().slice(0, 7);
  };
  const precedentOk = moisVoisin(-1) >= min.slice(0, 7);
  const suivantOk = moisVoisin(1) <= max.slice(0, 7);

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMois(moisVoisin(-1))}
          disabled={!precedentOk}
          className="kv-iconbtn border border-line-default disabled:opacity-30"
          aria-label="Mois précédent"
        >
          <Icon name="chevron_left" size={22} />
        </button>
        <p className="type-title-md capitalize" aria-live="polite">
          {libelle(premier, { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => setMois(moisVoisin(1))}
          disabled={!suivantOk}
          className="kv-iconbtn border border-line-default disabled:opacity-30"
          aria-label="Mois suivant"
        >
          <Icon name="chevron_right" size={22} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-[var(--inline-xs)] text-center">
        {JOURS_ENTETE.map((j, i) => (
          <span key={i} className="kv-overline">
            {j}
          </span>
        ))}
        {cases.map((j, i) => {
          if (!j) return <span key={`v${i}`} />;
          const hors = j < min || j > max;
          const choisi = j === valeur;
          const auj = j === min;
          return (
            <button
              key={j}
              type="button"
              disabled={hors}
              onClick={() => onChoisir(j)}
              aria-pressed={choisi}
              aria-label={libelle(j, { weekday: "long", day: "numeric", month: "long" })}
              className={`flex aspect-square items-center justify-center rounded-full type-label-lg ${
                choisi
                  ? "bg-action-primary text-fg-on-brand"
                  : hors
                    ? "text-fg-disabled"
                    : auj
                      ? "border-2 border-line-brand-solid"
                      : "hover:bg-action-tertiary"
              }`}
            >
              {Number(j.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="text-center kv-mono">{libelle(valeur, MOIS_COURT)}</p>
    </div>
  );
}
