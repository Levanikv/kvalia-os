"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { EtatRepas, LigneJournal, Repas, RepasPrecedent, Suggestion } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { BAS_TOAST } from "./Ajout";
import { ajouterAuJournalAction, repeterRepasAction, supprimerDuJournalAction } from "./actions";
import { ILLUSTRATIONS_REPAS, lienAjout } from "./donnees";

/**
 * Les repas de la journée en tuiles. Le repas du moment est en tête, en grand : ce qu'il vise, la meilleure idée
 * (ajoutée d'un geste) et « Comme hier ». Les autres tiennent sur deux colonnes : illustration, nom, calories, ce
 * qui est noté, et un « + » qui mène à la page d'ajout du repas (idées selon les calories, recettes, aliments).
 * Toucher un repas déjà noté ouvre ses lignes (retirer, compléter).
 * Règles : `parcoursRepas`, `suggererRepas`, `repeterRepas` du noyau.
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
type Props = {
  jour: string;
  aujourdhui: string;
  modifiable: boolean;
  repas: CarteRepas[];
  /** La meilleure idée de recette pour le repas du moment (aujourd'hui seulement). */
  idee: Suggestion | null;
};

const nf = (n: number) => n.toLocaleString("fr-FR");
const portionsTexte = (p: number) => (p === 1 ? "" : p === 0.5 ? "½ portion · " : `${String(p).replace(".", ",")} portions · `);
const noms = (libelles: string[]) => libelles.map((l) => l.split(" · ")[0]).join(", ");

/** « hier », sinon le jour de la semaine (« mardi »). */
function quand(precedent: string, jour: string, court = false): string {
  const ecart = Math.round((Date.parse(`${jour}T12:00:00Z`) - Date.parse(`${precedent}T12:00:00Z`)) / 86_400_000);
  if (ecart === 1) return "hier";
  const nom = new Date(`${precedent}T12:00:00Z`).toLocaleDateString("fr-FR", { weekday: court ? "short" : "long", timeZone: "UTC" });
  return court || ecart < 7 ? nom : `${nom} dernier`;
}

export function RepasDuJour({ jour, aujourdhui, modifiable, repas, idee }: Props) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState<Repas | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [occupe, start] = useTransition();

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
  const retirer = (l: LigneJournal) =>
    agir(async () => {
      const x = await supprimerDuJournalAction(l.id);
      return x.ok ? { ok: true, message: `${l.libelle.split(" · ")[0]} retiré` } : x;
    });

  const moment = repas.find((r) => r.etat === "maintenant") ?? null;
  const autres = repas.filter((r) => r !== moment);
  const detail = repas.find((r) => r.repas === ouvert) ?? null;
  /** Toucher une tuile : ses lignes si le repas est noté, sinon la page d'ajout. */
  const toucher = (r: CarteRepas) => (r.lignes.length ? setOuvert(r.repas) : modifiable ? router.push(lienAjout(r.repas, jour, aujourdhui)) : undefined);

  return (
    <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Repas du jour">
      <h2 className="px-[var(--inline-xs)] type-title-lg">Repas</h2>

      {moment && (
        <article className="flex flex-col gap-[var(--stack-md)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)]">
          <div className="flex items-center gap-[var(--inline-lg)]">
            <button type="button" onClick={() => toucher(moment)} className="flex min-w-0 flex-1 items-center gap-[var(--inline-lg)] text-left">
              <Illustration repas={moment.repas} grand />
              <span className="min-w-0 flex-1">
                <span className="block kv-overline text-fg-brand">Maintenant</span>
                <span className="block truncate type-title-lg">{moment.libelle}</span>
                <span className="block truncate type-body-sm text-fg-secondary">
                  {moment.lignes.length
                    ? `${nf(moment.kcal)} kcal · ${noms(moment.lignes.map((l) => l.libelle))}`
                    : moment.conseille_kcal >= 80
                      ? `Vise environ ${nf(moment.conseille_kcal)} kcal`
                      : "Rien de noté pour l’instant"}
                </span>
              </span>
            </button>
            <BoutonPlus repas={moment} jour={jour} aujourdhui={aujourdhui} primaire />
          </div>

          {idee && moment.lignes.length === 0 && (
            <div className="flex items-center gap-[var(--inline-md)] rounded-[var(--radius-tile)] bg-surface-container-brand-subtle p-[var(--inset-sm)]">
              <Link href={`/nutrition/recettes/${idee.id}?repas=${moment.repas}&jour=${jour}`} className="min-w-0 flex-1">
                <span className="block kv-overline text-fg-brand">Idée pour toi</span>
                <span className="line-clamp-2 type-title-sm">{idee.nom}</span>
                <span className="block truncate type-body-sm text-fg-secondary">
                  {portionsTexte(idee.portions)}
                  {nf(idee.kcal)} kcal
                </span>
              </Link>
              <button
                type="button"
                onClick={() => manger(moment.repas, idee)}
                disabled={occupe}
                aria-label={`Ajouter ${idee.nom} au journal`}
                className="kv-iconbtn shrink-0 bg-surface-container-inverse text-fg-inverse"
              >
                <Icon name="add" size={22} />
              </button>
            </div>
          )}
          {moment.precedent && moment.lignes.length === 0 && <CommeHier repas={moment} jour={jour} occupe={occupe} onRefaire={() => refaire(moment)} />}
        </article>
      )}

      <div className="grid grid-cols-2 gap-[var(--inline-md)]">
        {autres.map((r, i) => {
          const large = autres.length % 2 === 1 && i === autres.length - 1;
          return (
            <article
              key={r.repas}
              className={`relative flex min-w-0 flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] ${large ? "col-span-2" : ""}`}
            >
              {/* Toute la tuile se touche ; le « + » et « Comme hier » passent au-dessus. */}
              <button
                type="button"
                onClick={() => toucher(r)}
                aria-label={r.lignes.length ? `${r.libelle} · ${nf(r.kcal)} kcal · voir le détail` : `${r.libelle} · ajouter`}
                className="absolute inset-0 rounded-[var(--radius-card)]"
              />
              <div className="flex items-start justify-between">
                <Illustration repas={r.repas} />
                {modifiable && (
                  <span className="relative">
                    <BoutonPlus repas={r} jour={jour} aujourdhui={aujourdhui} />
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="truncate type-title-md">{r.libelle}</h3>
                {r.lignes.length ? (
                  <>
                    <p className="flex items-baseline gap-[var(--inline-xs)]">
                      <span className="type-title-lg tabular-nums">{nf(r.kcal)}</span>
                      <span className="type-label-md text-fg-tertiary">kcal</span>
                    </p>
                    <p className="line-clamp-2 type-body-sm text-fg-secondary">{noms(r.lignes.map((l) => l.libelle))}</p>
                  </>
                ) : (
                  <p className="type-body-sm text-fg-secondary">
                    {r.conseille_kcal >= 80 ? `Environ ${nf(r.conseille_kcal)} kcal` : modifiable ? "Rien de noté" : "Pas encore arrivé"}
                  </p>
                )}
              </div>
              {modifiable && r.precedent && r.lignes.length === 0 && (
                <span className="relative mt-auto">
                  <CommeHier repas={r} jour={jour} occupe={occupe} onRefaire={() => refaire(r)} compact />
                </span>
              )}
            </article>
          );
        })}
      </div>

      <BottomSheet
        ouvert={!!detail}
        onFermer={() => setOuvert(null)}
        titre={detail ? `${detail.libelle} · ${nf(detail.kcal)} kcal` : undefined}
        module="nutrition"
        pied={
          detail && modifiable ? (
            <Link href={lienAjout(detail.repas, jour, aujourdhui)} className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block">
              <Icon name="add" size={20} />
              <span className="kv-btn-label">Ajouter à ce repas</span>
            </Link>
          ) : undefined
        }
      >
        {detail && (
          <ul className="pb-[var(--stack-sm)]">
            {detail.lignes.map((l) => (
              <li key={l.id} className="flex items-center gap-[var(--inline-md)] border-b border-line-subtle py-[var(--inset-xs)] last:border-b-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-title-sm">{l.libelle}</span>
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
                <span className="shrink-0 text-right">
                  <span className="type-label-lg tabular-nums">{nf(l.kcal)}</span> <span className="kv-mono">kcal</span>
                </span>
                {modifiable && (
                  <button
                    type="button"
                    disabled={occupe}
                    onClick={() => {
                      if (detail.lignes.length === 1) setOuvert(null);
                      retirer(l);
                    }}
                    aria-label={`Retirer ${l.libelle}`}
                    className="kv-iconbtn shrink-0 text-icon-tertiary"
                  >
                    <Icon name="delete" size={20} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </BottomSheet>
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </section>
  );
}

function Illustration({ repas, grand }: { repas: Repas; grand?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-full bg-surface-container-sunken leading-none ${grand ? "h-16 w-16 text-[34px]" : "h-12 w-12 text-[26px]"}`}
    >
      {ILLUSTRATIONS_REPAS[repas]}
    </span>
  );
}

/** Le « + » d'un repas : vers sa page d'ajout (idées selon les calories, recettes, aliments). */
function BoutonPlus({ repas, jour, aujourdhui, primaire }: { repas: CarteRepas; jour: string; aujourdhui: string; primaire?: boolean }) {
  return (
    <Link
      href={lienAjout(repas.repas, jour, aujourdhui)}
      aria-label={`Ajouter à ${repas.libelle.toLowerCase()}`}
      className={`kv-iconbtn shrink-0 ${primaire ? "kv-iconbtn-primary !h-[var(--control-lg)] !w-[var(--control-lg)]" : "border border-line-default bg-surface-container-default text-fg-primary"}`}
    >
      <Icon name="add" size={primaire ? 26 : 22} />
    </Link>
  );
}

/** « Comme hier » : refaire le repas tel qu'il a été noté la dernière fois — un raccourci discret, pas un bouton principal. */
function CommeHier({
  repas,
  jour,
  occupe,
  onRefaire,
  compact,
}: {
  repas: CarteRepas;
  jour: string;
  occupe: boolean;
  onRefaire: () => void;
  compact?: boolean;
}) {
  if (!repas.precedent) return null;
  const p = repas.precedent;
  return (
    <button
      type="button"
      disabled={occupe}
      onClick={onRefaire}
      aria-label={`Refaire ${repas.libelle.toLowerCase()} comme ${quand(p.jour, jour)} : ${noms(p.libelles)}, ${nf(p.kcal)} kcal`}
      className="flex h-[var(--control-sm)] max-w-full items-center gap-[var(--inline-xs)] rounded-full bg-surface-container-sunken pl-[var(--inset-xs)] pr-[var(--inset-sm)] type-label-md text-fg-secondary"
    >
      <Icon name="replay" size={16} className="shrink-0" />
      <span className="truncate">
        Comme {quand(p.jour, jour, compact)}
        {compact ? "" : ` · ${noms(p.libelles)} · ${nf(p.kcal)} kcal`}
      </span>
    </button>
  );
}
