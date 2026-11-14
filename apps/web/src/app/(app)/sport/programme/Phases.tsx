import Link from "next/link";
import { plagesPhases } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { libelleFocus } from "../lib";

/** Teinte d'une phase dans la frise (maquette : hypertrophie gris, force noir, pic/mixte accent, décharge citron). */
export const TEINTE_PHASE: Record<string, string> = {
  hypertrophie: "bg-fg-tertiary",
  force: "bg-fg-primary",
  mixte: "bg-action-primary",
  deload: "bg-surface-container-accent",
};

type Props = { semaines: Array<{ semaine: number; focus: string }>; semaineCourante?: number | null };

/** Carte « Phases » : une barre par semaine, colorée par focus (« tu es ici » soulignée), et la légende en plages. */
export function Phases({ semaines, semaineCourante }: Props) {
  const groupes = plagesPhases(semaines);
  return (
    <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
      <h2 className="kv-overline">Phases</h2>
      <ol className="flex gap-[3px]" aria-label="Phases semaine par semaine">
        {[...semaines]
          .sort((a, b) => a.semaine - b.semaine)
          .map((s) => (
            <li
              key={s.semaine}
              title={`Semaine ${s.semaine} · ${libelleFocus(s.focus)}`}
              className={`h-2.5 flex-1 rounded-full ${TEINTE_PHASE[s.focus] ?? "bg-data-track"} ${
                semaineCourante && s.semaine === semaineCourante ? "ring-2 ring-focus-ring ring-offset-2 ring-offset-surface-container-default" : ""
              } ${semaineCourante && s.semaine > semaineCourante ? "opacity-70" : ""}`}
            />
          ))}
      </ol>
      <ul className="grid grid-cols-2 gap-x-[var(--inline-lg)] gap-y-[var(--stack-2xs)]">
        {groupes.map((g) => (
          <li key={g.focus} className="flex min-w-0 items-center gap-[var(--inline-sm)] kv-mono">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${TEINTE_PHASE[g.focus] ?? "bg-data-track"}`} aria-hidden />
            <span className="truncate">
              {libelleFocus(g.focus)} · {g.plages}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const LETTRES = ["D", "L", "M", "M", "J", "V", "S"];
export const ORDRE_SEMAINE = [1, 2, 3, 4, 5, 6, 0];

export type JourType = { jour: number; titre: string | null; detail: string; href?: string | null };

/** Carte « Semaine type » : un jour par ligne (L…D), séance ou repos, lien vers la séance si elle existe. */
export function SemaineType({ jours, note }: { jours: JourType[]; note?: string }) {
  return (
    <section className="flex flex-col gap-[var(--stack-sm)]">
      <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
        <h2 className="type-title-lg">Semaine type</h2>
        {note && <span className="kv-mono">{note}</span>}
      </div>
      <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
        {jours.map((j) => {
          const contenu = (
            <>
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full type-label-lg ${j.titre ? "bg-surface-container-inverse text-fg-inverse" : "bg-action-tertiary text-fg-secondary"}`}
              >
                {LETTRES[j.jour]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate type-title-sm">{j.titre ?? "Repos"}</span>
                <span className="block kv-mono">{j.titre ? j.detail : "Récupération"}</span>
              </span>
            </>
          );
          return (
            <li key={j.jour} className="border-b border-line-subtle last:border-b-0">
              {j.href ? (
                <Link href={j.href} className="tap flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
                  {contenu}
                  <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
                </Link>
              ) : (
                <div className="flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">{contenu}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
