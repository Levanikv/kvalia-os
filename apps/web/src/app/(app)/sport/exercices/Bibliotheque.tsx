"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LIBELLES } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { BoutonFiltres, ChampRecherche } from "@/components/ChampRecherche";
import { Icon } from "@/components/Icon";
import { Puces } from "@/components/Puces";
import { CREDIT_MEDIA } from "../lib";

type E = {
  id: string;
  nom: string;
  affiche: string;
  partie_corps: string | null;
  equipement: string | null;
  difficulte: string | null;
  image_url: string | null;
  muscles: string[];
  compose: boolean;
};

const PAGE = 40;
const PARTIES = ["chest", "back", "shoulders", "upper arms", "lower arms", "upper legs", "lower legs", "waist", "hips", "cardio"];

/**
 * Bibliothèque d'exercices. Trois niveaux de filtre, du plus utilisé au moins utilisé, jamais deux rangées :
 * la recherche, une rangée de puces (partie du corps), et la feuille « Filtres » (matériel, polyarticulaires) —
 * le bouton montre combien sont actifs, et chaque filtre actif se retire d'un tap sous la rangée.
 */
export function Bibliotheque({ exercices }: { exercices: E[] }) {
  const [q, setQ] = useState("");
  const [partie, setPartie] = useState<string | null>(null);
  const [materiel, setMateriel] = useState<string | null>(null);
  const [poly, setPoly] = useState(false);
  const [feuille, setFeuille] = useState(false);
  // On n'affiche qu'une page à la fois : la liste reste légère même avec plus de mille exercices.
  const [visibles, setVisibles] = useState(PAGE);

  const materiels = useMemo(() => [...new Set(exercices.map((e) => e.equipement).filter(Boolean) as string[])].sort(), [exercices]);
  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return exercices.filter(
      (e) =>
        (!partie || e.partie_corps === partie) &&
        (!materiel || e.equipement === materiel) &&
        (!poly || e.compose) &&
        (!t || e.affiche.toLowerCase().includes(t) || e.nom.toLowerCase().includes(t) || e.muscles.some((m) => m.toLowerCase().includes(t))),
    );
  }, [exercices, q, partie, materiel, poly]);
  /** Tout changement de filtre revient à la première page. */
  const filtrer = (f: () => void) => {
    f();
    setVisibles(PAGE);
  };
  const actifs = (materiel ? 1 : 0) + (poly ? 1 : 0);

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <ChampRecherche
        valeur={q}
        onChange={(v) => filtrer(() => setQ(v))}
        placeholder="Squat, lats, développé…"
        label="Chercher un exercice"
        apres={<BoutonFiltres actifs={actifs} onClick={() => setFeuille(true)} />}
      />
      <Puces
        label="Partie du corps"
        items={PARTIES.map((p) => ({ cle: p, label: LIBELLES.partie[p] ?? p }))}
        actif={partie}
        onChoisir={(p) => filtrer(() => setPartie(p))}
      />

      <div className="flex min-h-[var(--control-sm)] flex-wrap items-center gap-[var(--inline-sm)] px-[var(--inline-xs)]">
        <span className="type-label-md text-fg-secondary">
          {liste.length.toLocaleString("fr-FR")} exercice{liste.length > 1 ? "s" : ""}
        </span>
        {materiel && <FiltreActif label={LIBELLES.materiel[materiel] ?? materiel} onRetirer={() => filtrer(() => setMateriel(null))} />}
        {poly && <FiltreActif label="Polyarticulaires" onRetirer={() => filtrer(() => setPoly(false))} />}
      </div>

      {liste.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
          Aucun exercice pour cette recherche. Retire un filtre ou essaie un mot plus simple.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-[var(--inline-md)]">
          {liste.slice(0, visibles).map((e) => (
            <li key={e.id}>
              <Link
                href={`/sport/exercices/${e.id}`}
                className="tap flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default"
              >
                {/* Fond blanc : les animations de la bibliothèque sont dessinées sur blanc. */}
                <div className="aspect-square bg-white p-[var(--inset-xs)]">
                  {e.image_url && (
                    <img src={e.image_url} alt="" loading="lazy" decoding="async" width={180} height={180} className="h-full w-full object-contain" />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-[var(--stack-2xs)] p-[var(--inset-sm)]">
                  <p className="line-clamp-2 type-title-sm">{e.affiche}</p>
                  <p className="mt-auto truncate type-body-sm text-fg-secondary">
                    {[LIBELLES.partie[e.partie_corps ?? ""] ?? e.partie_corps, LIBELLES.materiel[e.equipement ?? ""] ?? e.equipement]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {liste.length > visibles && (
        <button type="button" onClick={() => setVisibles((n) => n + PAGE)} className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
          <span className="kv-btn-label">Afficher plus · {liste.length - visibles} restants</span>
        </button>
      )}
      <p className="text-center kv-mono">{CREDIT_MEDIA}</p>

      <BottomSheet
        ouvert={feuille}
        onFermer={() => setFeuille(false)}
        titre="Filtres"
        module="sport"
        pied={
          <div className="flex gap-[var(--inline-md)]">
            <button
              type="button"
              disabled={!actifs}
              onClick={() =>
                filtrer(() => {
                  setMateriel(null);
                  setPoly(false);
                })
              }
              className="kv-btn kv-btn-tertiary kv-btn-lg flex-1"
            >
              Tout effacer
            </button>
            <button type="button" onClick={() => setFeuille(false)} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.6]">
              <span className="kv-btn-label">
                Voir {liste.length.toLocaleString("fr-FR")} exercice{liste.length > 1 ? "s" : ""}
              </span>
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-xs)]">
          <section className="flex flex-col gap-[var(--stack-sm)]">
            <h3 className="type-title-sm">Matériel</h3>
            <div className="flex flex-wrap gap-[var(--inline-sm)]" role="radiogroup" aria-label="Matériel">
              {materiels.map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={materiel === m}
                  onClick={() => filtrer(() => setMateriel(materiel === m ? null : m))}
                  className={`kv-chip ${materiel === m ? "is-on" : ""}`}
                >
                  {LIBELLES.materiel[m] ?? m}
                </button>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-[var(--stack-sm)]">
            <h3 className="type-title-sm">Type de mouvement</h3>
            <button
              type="button"
              role="switch"
              aria-checked={poly}
              onClick={() => filtrer(() => setPoly(!poly))}
              className="tap flex items-center justify-between gap-[var(--inline-lg)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
            >
              <span>
                <span className="block type-title-sm">Polyarticulaires seulement</span>
                <span className="block type-body-sm text-fg-secondary">Les mouvements de base : squat, développé, tirage…</span>
              </span>
              <Icon name={poly ? "check_circle" : "radio_button_unchecked"} filled={poly} size={26} className={poly ? "text-fg-brand" : "text-icon-tertiary"} />
            </button>
          </section>
        </div>
      </BottomSheet>
    </div>
  );
}

/** Un filtre de la feuille, rappelé sous la recherche : un tap le retire. */
function FiltreActif({ label, onRetirer }: { label: string; onRetirer: () => void }) {
  return (
    <button
      type="button"
      onClick={onRetirer}
      aria-label={`Retirer le filtre ${label}`}
      className="flex h-[var(--control-sm)] items-center gap-[var(--inline-xs)] rounded-full bg-surface-container-brand-subtle pl-[var(--inset-sm)] pr-[var(--inset-xs)] type-label-md text-fg-brand"
    >
      {label}
      <Icon name="close" size={16} />
    </button>
  );
}
