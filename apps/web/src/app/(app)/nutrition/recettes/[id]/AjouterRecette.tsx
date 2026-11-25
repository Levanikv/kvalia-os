"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LIBELLES_REPAS, REPAS, type Repas } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { ajouterAuJournalAction } from "../../actions";

/** Barre d'action de la fiche recette : choisir le repas et le nombre de portions, puis ajouter au journal. */
type Props = { recetteId: string; nom: string; kcal: number; jour: string; repasInitial: Repas };

const PORTIONS = [0.5, 1, 1.5, 2];
const nf = (n: number) => n.toLocaleString("fr-FR");

export function AjouterRecette({ recetteId, nom, kcal, jour, repasInitial }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [repas, setRepas] = useState<Repas>(repasInitial);
  const [portions, setPortions] = useState(1);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, start] = useTransition();

  const ajouter = () =>
    start(async () => {
      setErreur(null);
      const r = await ajouterAuJournalAction({ jour, repas, recette_id: recetteId, portions });
      if (!r.ok) return setErreur(r.erreur);
      router.push(`/nutrition?jour=${jour}`);
      router.refresh();
    });

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
        <Icon name="add" size={22} />
        <span className="kv-btn-label">Ajouter au journal · {nf(kcal)} kcal</span>
      </button>
      <BottomSheet
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        titre={nom}
        module="nutrition"
        pied={
          <button type="button" onClick={ajouter} disabled={occupe} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
            <span className="kv-btn-label">{occupe ? "…" : `Ajouter · ${nf(Math.round(kcal * portions))} kcal`}</span>
          </button>
        }
      >
        <div className="flex flex-col gap-[var(--stack-lg)] pt-[var(--stack-xs)]">
          {erreur && (
            <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
          )}
          <section className="flex flex-col gap-[var(--stack-xs)]">
            <span className="px-[var(--inline-xs)] type-title-sm">Quel repas ?</span>
            <div className="flex flex-wrap gap-[var(--inline-sm)]" role="radiogroup" aria-label="Repas">
              {REPAS.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={repas === r}
                  onClick={() => setRepas(r)}
                  className={`kv-chip ${repas === r ? "is-on" : ""}`}
                >
                  {LIBELLES_REPAS[r]}
                </button>
              ))}
            </div>
          </section>
          <section className="flex flex-col gap-[var(--stack-xs)]">
            <span className="px-[var(--inline-xs)] type-title-sm">Combien de portions ?</span>
            <div className="kv-seg" role="radiogroup" aria-label="Portions">
              {PORTIONS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={portions === p}
                  onClick={() => setPortions(p)}
                  className={`kv-seg-item ${portions === p ? "is-on" : ""}`}
                >
                  {p === 0.5 ? "½" : String(p).replace(".", ",")}
                </button>
              ))}
            </div>
          </section>
        </div>
      </BottomSheet>
    </>
  );
}
