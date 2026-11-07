import Link from "next/link";
import { Icon } from "@/components/Icon";
import { libelleFocus, libelleType, nomAffiche, type SeanceComplete } from "./lib";

type Props = { seance: SeanceComplete; kcalPrevues: number; estAujourdhui: boolean; semaineNo: number | null; totalSemaines: number | null };

/** La carte principale de la vue Jour : ce qu'il y a à faire, en combien de temps, et le bouton pour y aller. */
export function HeroSeance({ seance: s, kcalPrevues, estAujourdhui, semaineNo, totalSemaines }: Props) {
  const exos = s.exercices_seance;
  const faits = exos.filter((e) => e.fait).length;
  const faite = s.etat === "faite";
  const enCours = s.etat === "en_cours";
  const progression = exos.length ? faits / exos.length : faite ? 1 : 0;
  const cta = faite ? "Voir le résumé" : enCours ? "Reprendre la séance" : estAujourdhui ? "Démarrer la séance" : "Voir la séance";

  return (
    <Link href={`/sport/seance/${s.id}`} className="block overflow-hidden rounded-lg border border-border bg-surface-2 active:opacity-90">
      <div className="relative p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/25 via-transparent to-transparent" aria-hidden />
        <div className="relative">
          <div className="flex items-center gap-2 text-xs font-medium text-text-2">
            <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent">{libelleType(s.type)}</span>
            {s.focus && <span>{libelleFocus(s.focus)}</span>}
            {semaineNo && totalSemaines && <span className="ml-auto">S{Math.min(Math.max(semaineNo, 1), totalSemaines)} · Bloc {s.bloc ?? Math.ceil(semaineNo / 4)}</span>}
          </div>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">{s.titre ?? libelleType(s.type)}</h2>

          <dl className="mt-4 flex gap-5">
            <div><dt className="text-[11px] uppercase tracking-wide text-text-3">Durée</dt><dd className="text-xl font-semibold">{s.duree_min ?? "—"}<span className="text-sm font-normal text-text-2"> min</span></dd></div>
            <div><dt className="text-[11px] uppercase tracking-wide text-text-3">{faite ? "Brûlées" : "Estimé"}</dt><dd className="text-xl font-semibold">{faite ? Number(s.kcal ?? 0) : kcalPrevues}<span className="text-sm font-normal text-text-2"> kcal</span></dd></div>
            {exos.length > 0 && <div><dt className="text-[11px] uppercase tracking-wide text-text-3">Exercices</dt><dd className="text-xl font-semibold">{enCours || faite ? `${faits}/${exos.length}` : exos.length}</dd></div>}
          </dl>

          {exos.length > 0 ? (
            <ul className="mt-4 space-y-1 text-sm text-text-2">
              {exos.slice(0, 4).map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <Icon name={e.fait ? "check_circle" : "radio_button_unchecked"} size={16} className={e.fait ? "text-success" : "text-text-3"} filled={e.fait} />
                  <span className={`truncate ${e.fait ? "line-through text-text-3" : ""}`}>{nomAffiche(e.exercices_ref)}</span>
                  <span className="ml-auto shrink-0 text-xs text-text-3">{e.series}×{e.reps}</span>
                </li>
              ))}
              {exos.length > 4 && <li className="text-xs text-text-3">+ {exos.length - 4} autres</li>}
            </ul>
          ) : s.notes ? (
            <p className="mt-4 text-sm text-text-2">{s.notes}</p>
          ) : null}

          {(enCours || faite) && (
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div className={`h-full ${faite ? "bg-success" : "bg-accent"} transition-all`} style={{ width: `${progression * 100}%` }} />
            </div>
          )}

          <div className={`tap mt-4 flex items-center justify-center gap-2 rounded-full font-semibold ${faite ? "bg-surface-3 text-text" : "bg-accent text-white"}`}>
            <Icon name={faite ? "task_alt" : "play_arrow"} size={22} filled />
            {cta}
          </div>
        </div>
      </div>
    </Link>
  );
}
