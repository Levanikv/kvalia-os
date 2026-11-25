"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ICONES_REPAS, type EtatRepas, type LigneJournal, type Repas, type RepasPrecedent, type Suggestion } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { useAjout } from "./Ajout";
import { ajouterAuJournalAction, repeterRepasAction, supprimerDuJournalAction, suggererAction } from "./actions";

/**
 * Les repas de la journée, un seul déplié à la fois. Replié : ce qui a été mangé en une ligne, ou les calories
 * conseillées tant que rien n'est noté. Déplié — par défaut le repas du moment — : les lignes, puis le chemin le
 * plus court pour noter : refaire le même repas que la dernière fois, scanner, chercher, ou une idée de recette
 * choisie selon le reste du jour et la séance (règles : `parcoursRepas`, `suggererRepas`, `repeterRepas` du noyau).
 */
export type CarteRepas = {
  repas: Repas;
  libelle: string;
  kcal: number;
  lignes: LigneJournal[];
  etat: EtatRepas;
  conseille_kcal: number;
  precedent?: RepasPrecedent;
};
type Idees = { message: string; suggestions: Suggestion[] };
type Props = {
  jour: string;
  /** Total mangé : quand il change, les idées sont recalculées. */
  consomme: number;
  modifiable: boolean;
  repas: CarteRepas[];
  focus: Repas | null;
  ideesFocus: Idees | null;
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const BAS_TOAST = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--control-xl) + var(--stack-md))";
const portionsTexte = (p: number) => (p === 1 ? "" : p === 0.5 ? "½ portion · " : `${String(p).replace(".", ",")} portions · `);
const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** « hier », sinon le jour de la semaine (« mardi »). */
function quand(precedent: string, jour: string): string {
  const ecart = Math.round((Date.parse(`${jour}T12:00:00Z`) - Date.parse(`${precedent}T12:00:00Z`)) / 86_400_000);
  if (ecart === 1) return "hier";
  const nom = new Date(`${precedent}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: "long", timeZone: "UTC" });
  return ecart < 7 ? nom : `${nom} dernier`;
}

export function RepasDuJour({ jour, consomme, modifiable, repas, focus, ideesFocus }: Props) {
  const router = useRouter();
  const { ouvrir } = useAjout();
  const [ouvert, setOuvert] = useState<Repas | null>(focus);
  const [idees, setIdees] = useState<Record<string, Idees>>(focus && ideesFocus ? { [`${focus}-${consomme}`]: ideesFocus } : {});
  const [ligne, setLigne] = useState<LigneJournal | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [occupe, start] = useTransition();
  const cle = ouvert ? `${ouvert}-${consomme}` : null;

  // Idées du repas déplié : celles du repas du moment arrivent avec la page, les autres à l'ouverture.
  useEffect(() => {
    if (!modifiable || !ouvert || !cle || idees[cle]) return;
    let actif = true;
    suggererAction(jour, ouvert).then((r) => {
      if (actif && r.ok) setIdees((x) => ({ ...x, [cle]: { message: r.valeur.message, suggestions: r.valeur.suggestions } }));
    });
    return () => {
      actif = false;
    };
  }, [cle, ouvert, jour, modifiable, idees]);

  const agir = (f: () => Promise<{ ok: true; message: string } | { ok: false; erreur: string }>) =>
    start(async () => {
      const r = await f();
      setToast(r.ok ? r.message : r.erreur);
      if (r.ok) router.refresh();
    });
  const manger = (r: Repas, s: Suggestion) =>
    agir(async () => {
      const x = await ajouterAuJournalAction({ jour, repas: r, recette_id: s.id, portions: s.portions });
      return x.ok ? { ok: true, message: `${s.nom} ajouté · ${nf(x.valeur.kcal)} kcal` } : x;
    });
  const refaire = (r: CarteRepas) =>
    agir(async () => {
      const x = await repeterRepasAction(jour, r.repas);
      return x.ok ? { ok: true, message: `${r.libelle} refait · ${nf(x.valeur.kcal)} kcal` } : x;
    });

  return (
    <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Repas du jour">
      <h2 className="px-[var(--inline-xs)] type-title-lg">Repas</h2>
      {repas.map((r) => {
        const deplie = ouvert === r.repas;
        const maintenant = r.etat === "maintenant";
        const propositions = deplie && cle ? idees[cle] : undefined;
        const resume = r.lignes.length
          ? r.lignes.map((l) => l.libelle.split(" · ")[0]).join(", ")
          : r.conseille_kcal >= 80
            ? `Conseillé ≈ ${nf(r.conseille_kcal)} kcal`
            : "Rien noté";
        return (
          <article
            key={r.repas}
            className={`overflow-hidden border bg-surface-container-default shadow-card ${deplie ? "rounded-[var(--radius-card-hero)] border-line-default" : "rounded-[var(--radius-card)] border-line-subtle"}`}
          >
            <button
              type="button"
              onClick={() => setOuvert(deplie ? null : r.repas)}
              aria-expanded={deplie}
              className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)] text-left"
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${maintenant ? "bg-action-primary text-icon-on-brand" : "bg-surface-container-brand-subtle text-fg-brand"}`}
              >
                <Icon name={ICONES_REPAS[r.repas]} size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-[var(--inline-sm)]">
                  <span className={deplie ? "type-title-md" : "type-title-sm"}>{r.libelle}</span>
                  {maintenant && <span className="kv-tag kv-tag-brand">Maintenant</span>}
                </span>
                <span className={`block truncate type-body-sm ${r.lignes.length ? "text-fg-secondary" : "text-fg-tertiary"}`}>{resume}</span>
              </span>
              {r.kcal > 0 && (
                <span className="shrink-0 text-right">
                  <span className="type-label-lg tabular-nums">{nf(r.kcal)}</span> <span className="kv-mono">kcal</span>
                </span>
              )}
              <Icon name={deplie ? "expand_less" : "expand_more"} size={22} className="shrink-0 text-icon-tertiary" />
            </button>

            {deplie && (
              <div className="flex flex-col gap-[var(--stack-md)] px-[var(--inset-md)] pb-[var(--inset-md)]">
                {r.lignes.length > 0 && (
                  <ul className="overflow-hidden rounded-[var(--radius-tile)] bg-surface-container-sunken">
                    {r.lignes.map((l) => (
                      <li key={l.id} className="border-b border-line-subtle last:border-b-0">
                        <button
                          type="button"
                          onClick={() => setLigne(l)}
                          className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-sm)] py-[var(--inset-xs)] text-left"
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

                {modifiable && (
                  <>
                    {r.precedent && r.lignes.length === 0 && (
                      <button
                        type="button"
                        disabled={occupe}
                        onClick={() => refaire(r)}
                        className="tap flex w-full items-center gap-[var(--inline-md)] rounded-[var(--radius-tile)] bg-surface-container-brand-subtle p-[var(--inset-sm)] text-left"
                      >
                        <Icon name="replay" size={22} className="shrink-0 text-fg-brand" />
                        <span className="min-w-0 flex-1">
                          <span className="block type-title-sm">Comme {quand(r.precedent.jour, jour)}</span>
                          <span className="block truncate type-body-sm text-fg-secondary">{r.precedent.libelles.map((l) => l.split(" · ")[0]).join(", ")}</span>
                        </span>
                        <span className="shrink-0 type-label-md tabular-nums">{nf(r.precedent.kcal)} kcal</span>
                      </button>
                    )}
                    {/* Le repas du moment se note depuis la barre d'action fixe : pas de doublon ici. */}
                    {!maintenant && (
                      <div className="grid grid-cols-2 gap-[var(--inline-md)]">
                        <button type="button" onClick={() => ouvrir(r.repas, true)} className="kv-btn kv-btn-secondary kv-btn-lg">
                          <Icon name="barcode_scanner" size={20} />
                          <span className="kv-btn-label">Scanner</span>
                        </button>
                        <button type="button" onClick={() => ouvrir(r.repas)} className="kv-btn kv-btn-tertiary kv-btn-lg">
                          <Icon name="search" size={20} />
                          <span className="kv-btn-label">Chercher</span>
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col gap-[var(--stack-xs)]" aria-live="polite">
                      <p className="flex items-center gap-[var(--inline-xs)] kv-overline text-fg-brand">
                        <Icon name="auto_awesome" size={14} /> Idées pour ce repas
                      </p>
                      <p className="type-body-sm text-fg-secondary">{propositions ? propositions.message : "Je regarde ce qui convient…"}</p>
                      {propositions && propositions.suggestions.length > 0 && (
                        <ul className="flex flex-col">
                          {propositions.suggestions.slice(0, 3).map((s) => (
                            <li
                              key={s.id}
                              className="flex items-center gap-[var(--inline-md)] border-b border-line-subtle py-[var(--inset-xs)] last:border-b-0"
                            >
                              <Link href={`/nutrition/recettes/${s.id}?repas=${r.repas}&jour=${jour}`} className="min-w-0 flex-1">
                                <span className="block truncate type-title-sm">{s.nom}</span>
                                <span className="block truncate kv-mono">
                                  {portionsTexte(s.portions)}
                                  {nf(s.kcal)} kcal · P {s.prot} g · {majuscule(s.raison)}
                                </span>
                              </Link>
                              <button
                                type="button"
                                onClick={() => manger(r.repas, s)}
                                disabled={occupe}
                                aria-label={`Ajouter ${s.nom} au journal`}
                                className="kv-iconbtn kv-iconbtn-primary shrink-0"
                              >
                                <Icon name="add" size={22} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href={`/nutrition/recettes?repas=${r.repas}`}
                        className="flex items-center gap-[var(--inline-xs)] pt-[var(--stack-xs)] type-label-md text-fg-link"
                      >
                        Toutes les recettes <Icon name="chevron_right" size={18} />
                      </Link>
                    </div>
                  </>
                )}
                {!modifiable && r.lignes.length === 0 && <p className="type-body-sm text-fg-secondary">Ce jour n’est pas encore arrivé.</p>}
              </div>
            )}
          </article>
        );
      })}

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
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </section>
  );
}
