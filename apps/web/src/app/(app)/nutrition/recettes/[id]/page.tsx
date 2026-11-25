import Link from "next/link";
import { notFound } from "next/navigation";
import { LIBELLES_REPAS, Repas, repasDuMoment } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { aujourdhui, session } from "@/lib/session";
import { jourDepuis } from "../../../sport/lib";
import { LIBELLES_TAGS } from "../tags";
import { AjouterRecette } from "./AjouterRecette";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ repas?: string; jour?: string }> };
type Ingredient = { aliment_id: string | null; nom: string; g: number };

const nf = (n: number) => n.toLocaleString("fr-FR");

/** Fiche recette : macros par portion, ingrédients (grammes), étapes ; « Ajouter au journal » en barre d'action fixe. */
export default async function Page({ params, searchParams }: Props) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const { supabase } = await session();
  const { data: r } = await supabase
    .from("recettes")
    .select("id, nom, repas, tags, temps_min, kcal, prot, gluc, lip, fibres, ingredients_detail, etapes, instructions")
    .eq("id", id)
    .maybeSingle();
  if (!r) notFound();
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const demande = Repas.safeParse(sp.repas);
  const moment = repasDuMoment();
  const repasPossibles = (r.repas ?? []).map((x) => Repas.safeParse(x)).flatMap((x) => (x.success ? [x.data] : []));
  const repas = demande.success ? demande.data : repasPossibles.includes(moment) ? moment : (repasPossibles[0] ?? moment);
  // jsonb validé à la lecture : une liste d'ingrédients { nom, g }.
  const ingredients = (Array.isArray(r.ingredients_detail) ? r.ingredients_detail : []) as Ingredient[];
  const etapes = r.etapes?.length ? r.etapes : (r.instructions ?? "").split("\n").filter(Boolean);
  const macros = [
    ["Calories", Math.round(Number(r.kcal ?? 0)), "kcal"],
    ["Protéines", Math.round(Number(r.prot ?? 0)), "g"],
    ["Glucides", Math.round(Number(r.gluc ?? 0)), "g"],
    ["Lipides", Math.round(Number(r.lip ?? 0)), "g"],
  ] as const;

  return (
    <ModuleFrame
      module="nutrition"
      titre="Recette"
      sousTitre={r.temps_min ? `${r.temps_min} min` : undefined}
      gauche={
        <Link href="/nutrition/recettes" className="kv-iconbtn" aria-label="Retour aux recettes">
          <Icon name="chevron_left" size={24} />
        </Link>
      }
      pied={jour <= auj ? <AjouterRecette recetteId={r.id} nom={r.nom} kcal={Math.round(Number(r.kcal ?? 0))} jour={jour} repasInitial={repas} /> : undefined}
    >
      <div className="cascade flex flex-col gap-[var(--stack-lg)]">
        <h2 className="type-display-md">{r.nom}</h2>
        <dl className="grid grid-cols-4 gap-[var(--inline-sm)]">
          {macros.map(([k, v, u]) => (
            <div key={k} className="kv-stat">
              <dt className="kv-overline">{k}</dt>
              <dd className="kv-stat-row">
                <span className="type-title-md tabular-nums">{nf(v)}</span>
                <span className="kv-mono">{u}</span>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-[var(--inline-xs)]">
          {repasPossibles.map((x) => (
            <span key={x} className="kv-tag kv-tag-brand">
              {LIBELLES_REPAS[x]}
            </span>
          ))}
          {(r.tags ?? [])
            .filter((t) => LIBELLES_TAGS[t])
            .map((t) => (
              <span key={t} className="kv-tag kv-tag-neutral">
                {LIBELLES_TAGS[t]}
              </span>
            ))}
        </div>

        <section className="flex flex-col gap-[var(--stack-sm)]">
          <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
            <h2 className="type-title-lg">Ingrédients</h2>
            <span className="kv-mono">pour 1 portion</span>
          </div>
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
            {ingredients.map((i) => (
              <li
                key={i.nom}
                className="flex items-baseline justify-between gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0"
              >
                <span className="type-body-md">{i.nom}</span>
                <span className="shrink-0 type-label-md tabular-nums">{nf(i.g)} g</span>
              </li>
            ))}
          </ul>
        </section>

        {etapes.length > 0 && (
          <section className="flex flex-col gap-[var(--stack-sm)]">
            <h2 className="px-[var(--inline-xs)] type-title-lg">Préparation</h2>
            <ol className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
              {etapes.map((e, i) => (
                <li key={e} className="flex gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0">
                  <span className="kv-mono pt-0.5 !text-fg-brand">{String(i + 1).padStart(2, "0")}</span>
                  <span className="type-body-md">{e}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
        <p className="px-[var(--inline-xs)] type-body-sm text-fg-tertiary">Macros calculées depuis la table CIQUAL de l’ANSES, pour les quantités indiquées.</p>
      </div>
    </ModuleFrame>
  );
}
