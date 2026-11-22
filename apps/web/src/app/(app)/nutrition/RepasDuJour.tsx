"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ICONES_REPAS, type LigneJournal, type Repas } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { useAjout } from "./Ajout";
import { supprimerDuJournalAction } from "./actions";

/** Les repas de la journée : ce qui a été mangé à chacun, son total, « Ajouter » (ouvre la feuille sur ce repas), retirer une ligne. */
type Props = { repas: Array<{ repas: Repas; libelle: string; kcal: number; lignes: LigneJournal[] }>; modifiable: boolean };

const nf = (n: number) => n.toLocaleString("fr-FR");

export function RepasDuJour({ repas, modifiable }: Props) {
  const router = useRouter();
  const { ouvrir } = useAjout();
  const [ligne, setLigne] = useState<LigneJournal | null>(null);
  const [occupe, start] = useTransition();

  return (
    <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Repas du jour">
      <h2 className="px-[var(--inline-xs)] type-title-lg">Repas</h2>
      {repas.map((r) => (
        <div key={r.repas} className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
          <div className="flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
              <Icon name={ICONES_REPAS[r.repas]} size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block type-title-sm">{r.libelle}</span>
              <span className="block kv-mono">{r.lignes.length ? `${r.lignes.length} élément${r.lignes.length > 1 ? "s" : ""}` : "Rien pour l’instant"}</span>
            </span>
            {r.kcal > 0 && (
              <span className="shrink-0 text-right">
                <span className="type-label-lg tabular-nums">{nf(r.kcal)}</span> <span className="kv-mono">kcal</span>
              </span>
            )}
            {modifiable && (
              <button
                type="button"
                onClick={() => ouvrir(r.repas)}
                aria-label={`Ajouter à ${r.libelle}`}
                className="kv-iconbtn shrink-0 border border-line-default"
              >
                <Icon name="add" size={22} />
              </button>
            )}
          </div>
          {r.lignes.length > 0 && (
            <ul className="border-t border-line-subtle">
              {r.lignes.map((l) => (
                <li key={l.id} className="border-b border-line-subtle last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setLigne(l)}
                    className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-xs)] text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate type-body-md">{l.libelle}</span>
                      <span className="block truncate kv-mono">
                        {[
                          l.quantite_g
                            ? `${nf(l.quantite_g)} g`
                            : l.recette_id
                              ? `${String(l.portions).replace(".", ",")} portion${l.portions > 1 ? "s" : ""}`
                              : null,
                          `P ${nf(Math.round(l.prot))} · G ${nf(Math.round(l.gluc))} · L ${nf(Math.round(l.lip))}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="shrink-0 type-label-md tabular-nums">{nf(l.kcal)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <BottomSheet
        ouvert={!!ligne}
        onFermer={() => setLigne(null)}
        titre={ligne?.libelle}
        module="nutrition"
        pied={
          <div className="flex gap-[var(--inline-md)]">
            <button type="button" onClick={() => setLigne(null)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
              Garder
            </button>
            <button
              type="button"
              disabled={occupe}
              onClick={() =>
                ligne &&
                start(async () => {
                  await supprimerDuJournalAction(ligne.id);
                  setLigne(null);
                  router.refresh();
                })
              }
              className="kv-btn kv-btn-danger kv-btn-lg flex-1"
            >
              Retirer
            </button>
          </div>
        }
      >
        {ligne && (
          <dl className="grid grid-cols-4 gap-[var(--inline-sm)] pb-[var(--stack-sm)]">
            {[
              ["Calories", ligne.kcal, "kcal"],
              ["Protéines", Math.round(ligne.prot), "g"],
              ["Glucides", Math.round(ligne.gluc), "g"],
              ["Lipides", Math.round(ligne.lip), "g"],
            ].map(([k, v, u]) => (
              <div key={String(k)} className="kv-stat">
                <dt className="kv-overline">{k}</dt>
                <dd className="kv-stat-row">
                  <span className="type-title-md tabular-nums">{nf(Number(v))}</span>
                  <span className="kv-mono">{u}</span>
                </dd>
              </div>
            ))}
          </dl>
        )}
      </BottomSheet>
    </section>
  );
}
