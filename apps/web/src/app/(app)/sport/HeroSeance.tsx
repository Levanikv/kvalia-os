import Link from "next/link";
import { Icon } from "@/components/Icon";
import { libelleFocus, libellePartie, libelleType, nomAffiche, type SeanceComplete } from "./lib";

type Props = {
  seance: SeanceComplete;
  kcalPrevues: number;
  estAujourdhui: boolean;
  semaineNo: number | null;
  totalSemaines: number | null;
  /** « 1/2 » quand le jour porte plusieurs séances. */
  rang?: string | null;
};

/**
 * Carte héros de la vue Jour (maquette « Home mix ») : carte sombre (sous-thème dark), titre géant, trois chiffres,
 * CTA principal avec flèche. Une seule par écran.
 */
export function HeroSeance({ seance: s, kcalPrevues, estAujourdhui, semaineNo, totalSemaines, rang }: Props) {
  const exos = s.exercices_seance;
  const faits = exos.filter((e) => e.fait).length;
  const faite = s.etat === "faite";
  const enCours = s.etat === "en_cours";
  const progression = exos.length ? faits / exos.length : faite ? 1 : 0;
  const cta = faite ? "Voir le résumé" : enCours ? "Reprendre la séance" : estAujourdhui ? "Démarrer la séance" : "Voir la séance";
  const parties = [...new Set(exos.map((e) => e.exercices_ref?.partie_corps).filter(Boolean))].slice(0, 3);
  const chiffres: Array<[string, string, string?]> = [
    ["Durée", String(s.duree_min ?? "—"), "min"],
    ["Exercices", enCours || faite ? `${faits}/${exos.length}` : String(exos.length)],
    [faite ? "Brûlées" : "Estimé", `≈ ${faite ? Number(s.kcal ?? 0) : kcalPrevues}`, "kcal"],
  ];

  return (
    <Link
      href={`/sport/seance/${s.id}`}
      data-module="sport"
      data-theme="dark"
      className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised active:opacity-95"
    >
      <div className="kv-ground-content flex flex-col gap-[var(--stack-lg)] p-[var(--inset-lg)]">
        <div className="flex items-center gap-[var(--inline-sm)]">
          <span className="kv-tag kv-tag-brand">{estAujourdhui ? "Aujourd’hui" : libelleType(s.type)}</span>
          {rang && <span className="kv-tag kv-tag-neutral">{rang}</span>}
          {semaineNo && totalSemaines && (
            <span className="kv-mono ml-auto">
              S{Math.min(Math.max(semaineNo, 1), totalSemaines)} · bloc {s.bloc ?? Math.ceil(semaineNo / 4)}
            </span>
          )}
        </div>
        <div>
          <h2 className="type-display-lg">{s.titre ?? libelleType(s.type)}</h2>
          <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
            {[libelleFocus(s.focus), ...parties.map((p) => libellePartie(p ?? null))].filter(Boolean).join(" · ") || libelleType(s.type)}
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-[var(--inline-lg)] border-t border-line-default pt-[var(--stack-md)]">
          {chiffres.map(([k, v, u]) => (
            <div key={k}>
              <dt className="kv-overline">{k}</dt>
              <dd className="type-numeric-md">
                {v}
                {u && <span className="kv-mono"> {u}</span>}
              </dd>
            </div>
          ))}
        </dl>
        {exos.length > 0 && !faite && !enCours && (
          <ul className="flex flex-col gap-[var(--stack-xs)] type-body-sm text-fg-secondary">
            {exos.slice(0, 3).map((e) => (
              <li key={e.id} className="flex justify-between gap-[var(--inline-md)]">
                <span className="truncate">{nomAffiche(e.exercices_ref)}</span>
                <span className="kv-mono shrink-0">
                  {e.series} × {e.reps}
                </span>
              </li>
            ))}
            {exos.length > 3 && <li className="kv-mono">+ {exos.length - 3} autres</li>}
          </ul>
        )}
        {(enCours || faite) && (
          <div className="kv-progress-track" aria-hidden>
            <div className={`kv-progress-fill ${faite ? "bg-feedback-success" : "bg-action-primary"}`} style={{ width: `${progression * 100}%` }} />
          </div>
        )}
        <span className={`kv-btn kv-btn-xl kv-btn-block kv-btn-has-end ${faite ? "kv-btn-tertiary" : "kv-btn-primary"}`}>
          <span className="kv-btn-label">{cta}</span>
          <span className="kv-btn-end">
            <Icon name={faite ? "task_alt" : "arrow_forward"} size={22} />
          </span>
        </span>
      </div>
    </Link>
  );
}
