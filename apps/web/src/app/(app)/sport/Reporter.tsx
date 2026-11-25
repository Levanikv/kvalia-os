"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { deplacerSeanceAction } from "./actions";

/**
 * Déplacer une séance (outil `deplacer_seance`) : sous la séance du jour, « Reporter » ouvre une feuille avec les
 * sept prochains jours — libre ou déjà pris. Jour libre : seule cette séance bouge. Jour pris : on choisit de décaler
 * la suite d'un créneau (le programme suit) ou d'échanger les deux. Un jour de repos, « La faire aujourd'hui » amène
 * la prochaine séance à aujourd'hui, d'un geste.
 */
type Seance = { id: string; titre: string | null; jour: string };
/** Séances de salle prévues dans les jours qui viennent : jour → titre. */
export type Occupes = Record<string, string>;

const BAS_TOAST = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--stack-md))";
const decaler = (jour: string, n: number) => {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const nomJour = (jour: string, auj: string) =>
  jour === auj
    ? "Aujourd’hui"
    : jour === decaler(auj, 1)
      ? "Demain"
      : new Date(`${jour}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

export function ReporterSeance({ seance, aujourdhui, occupes }: { seance: Seance; aujourdhui: string; occupes: Occupes }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [choix, setChoix] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [occupe, start] = useTransition();

  const depart = seance.jour > aujourdhui ? aujourdhui : decaler(aujourdhui, 1);
  const jours = Array.from({ length: 8 }, (_, i) => decaler(depart, i))
    .filter((j) => j !== seance.jour)
    .slice(0, 7);
  const pris = choix ? occupes[choix] : undefined;

  const deplacer = (si_occupe: "decaler" | "echanger") =>
    choix &&
    start(async () => {
      setErreur(null);
      const r = await deplacerSeanceAction(seance.id, choix, si_occupe);
      if (!r.ok) return setErreur(r.erreur);
      const autres = r.valeur.deplacees.length - 1;
      setOuvert(false);
      setToast(
        `Séance reportée à ${nomJour(choix, aujourdhui).toLowerCase()}${autres > 0 ? ` · ${autres} autre${autres > 1 ? "s" : ""} décalée${autres > 1 ? "s" : ""}` : ""}`,
      );
      router.refresh();
    });

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setChoix(null);
          setErreur(null);
          setOuvert(true);
        }}
        className="tap flex items-center justify-center gap-[var(--inline-xs)] self-center type-label-md text-fg-secondary"
      >
        <Icon name="event_repeat" size={18} /> Pas dispo ? Reporter
      </button>

      <BottomSheet
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre="Reporter la séance"
        module="sport"
        pied={
          choix ? (
            pris ? (
              <div className="flex flex-col gap-[var(--stack-sm)]">
                <button type="button" disabled={occupe} onClick={() => deplacer("decaler")} className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block">
                  <span className="kv-btn-label">{occupe ? "…" : "Décaler la suite d’un créneau"}</span>
                </button>
                <button type="button" disabled={occupe} onClick={() => deplacer("echanger")} className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
                  <span className="kv-btn-label">Échanger les deux séances</span>
                </button>
              </div>
            ) : (
              <button type="button" disabled={occupe} onClick={() => deplacer("decaler")} className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block">
                <span className="kv-btn-label">{occupe ? "…" : `Reporter à ${nomJour(choix, aujourdhui).toLowerCase()}`}</span>
              </button>
            )
          ) : undefined
        }
      >
        <div className="flex flex-col gap-[var(--stack-md)] pt-[var(--stack-xs)]">
          <p className="type-body-sm text-fg-secondary">{seance.titre ?? "Séance"} — choisis le jour où tu peux la faire.</p>
          {erreur && (
            <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
          )}
          <ul
            className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default"
            role="radiogroup"
            aria-label="Nouveau jour"
          >
            {jours.map((j) => (
              <li key={j} className="border-b border-line-subtle last:border-b-0">
                <button
                  type="button"
                  role="radio"
                  aria-checked={choix === j}
                  onClick={() => setChoix(j)}
                  className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block type-title-sm">{majuscule(nomJour(j, aujourdhui))}</span>
                    <span className={`block truncate type-body-sm ${occupes[j] ? "text-fg-secondary" : "text-fg-tertiary"}`}>{occupes[j] ?? "Libre"}</span>
                  </span>
                  <Icon
                    name={choix === j ? "radio_button_checked" : "radio_button_unchecked"}
                    size={22}
                    className={choix === j ? "text-fg-brand" : "text-icon-tertiary"}
                  />
                </button>
              </li>
            ))}
          </ul>
          {pris && (
            <p className="type-body-sm text-fg-secondary">
              {pris} est déjà prévue ce jour-là. Décaler pousse cette séance et les suivantes au créneau d’après, sans en supprimer ; échanger intervertit
              seulement les deux.
            </p>
          )}
        </div>
      </BottomSheet>
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </>
  );
}

/** Jour de repos : amène la prochaine séance à aujourd'hui (son jour d'origine devient un jour de repos). */
export function FaireAujourdhui({ seance, aujourdhui }: { seance: Seance; aujourdhui: string }) {
  const router = useRouter();
  const [toast, setToast] = useState<string | null>(null);
  const [occupe, start] = useTransition();
  return (
    <>
      <button
        type="button"
        disabled={occupe}
        onClick={() =>
          start(async () => {
            const r = await deplacerSeanceAction(seance.id, aujourdhui, "decaler");
            if (!r.ok) return setToast(r.erreur);
            router.refresh();
          })
        }
        className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block border border-line-default"
      >
        <Icon name="bolt" size={20} />
        <span className="kv-btn-label">{occupe ? "…" : "Dispo aujourd’hui ? Faire cette séance"}</span>
      </button>
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </>
  );
}
