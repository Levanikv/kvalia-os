"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { reinitialiserSportAction } from "./actions";

/**
 * TEMPORAIRE (tests v0) — « Remettre Sport à zéro » : efface programmes, séances, séances perso, réglages et
 * onboarding Sport, puis rouvre l'onboarding. À retirer quand la v1 est validée (avec l'outil reinitialiser_sport).
 */
export function ResetSport() {
  const router = useRouter();
  const [, start] = useTransition();
  const [ouvert, setOuvert] = useState(false);
  const [texte, setTexte] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function effacer() {
    setOccupe(true);
    setErreur(null);
    start(async () => {
      try {
        await reinitialiserSportAction();
        router.push("/sport");
        router.refresh();
      } catch (e) {
        setOccupe(false);
        setErreur(e instanceof Error ? e.message : "La remise à zéro a échoué.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-md)]">
      <span className="kv-tag kv-tag-warning self-start">Outils de test · temporaire</span>
      <p className="type-body-sm text-fg-secondary">
        Repartir de zéro dans Sport pour retester l’onboarding et les parcours. Les pesées et la nutrition sont gardées.
      </p>
      <button type="button" onClick={() => setOuvert(true)} className="kv-btn kv-btn-danger kv-btn-lg kv-btn-block">
        <Icon name="restart_alt" size={20} />
        <span className="kv-btn-label">Remettre Sport à zéro</span>
      </button>

      <BottomSheet
        ouvert={ouvert}
        onFermer={() => {
          setOuvert(false);
          setTexte("");
        }}
        titre="Remettre Sport à zéro ?"
      >
        <p className="type-body-md text-fg-secondary">
          Programmes, séances (faites comprises), séances perso, réglages et onboarding Sport seront effacés. C’est irréversible. Tu repars sur l’onboarding.
        </p>
        <label className="mt-[var(--stack-md)] block">
          <span className="type-label-md">Tape EFFACER pour confirmer</span>
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            className="mt-[var(--stack-xs)] h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
          />
        </label>
        {erreur && <p className="mt-[var(--stack-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>}
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setOuvert(false)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
            Annuler
          </button>
          <button
            type="button"
            onClick={effacer}
            disabled={texte.trim().toUpperCase() !== "EFFACER" || occupe}
            className="kv-btn kv-btn-danger kv-btn-lg flex-1"
          >
            {occupe ? "…" : "Effacer"}
          </button>
        </div>
      </BottomSheet>
    </section>
  );
}
