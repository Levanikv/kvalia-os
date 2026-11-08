import Link from "next/link";
import { LIBELLES } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { aujourdhui, session } from "@/lib/session";
import { libelleFocus, libelleType } from "../lib";

/** Programme : le plan complet par blocs et semaines ; la semaine courante est dépliée. */
export default async function Page() {
  const { supabase } = await session();
  const auj = aujourdhui();
  const { data: prog } = await supabase.from("programmes").select("*").eq("actif", true).maybeSingle();
  const { data: seances } = prog
    ? await supabase.from("seances").select("id, jour, type, titre, etat, bloc, semaine, focus, duree_min, kcal").eq("programme_id", prog.id).order("jour")
    : { data: [] };

  const retour = <Link href="/sport" className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour"><Icon name="arrow_back" size={24} /></Link>;
  if (!prog) {
    return (
      <ModuleFrame module="sport" titre="Programme" gauche={retour}>
        <div className="mt-4 rounded-lg border border-dashed border-border p-5">
          <p className="text-xl font-semibold">Aucun programme actif</p>
          <p className="mt-1 text-sm text-text-2">Génère-le depuis les réglages : rythme, matériel, objectif, durée.</p>
          <Link href="/reglages/sport" className="tap mt-4 flex items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white"><Icon name="auto_awesome" size={20} /> Générer</Link>
        </div>
      </ModuleFrame>
    );
  }

  const r = prog.rythme as { salle?: number; boxe?: number; objectif?: string; niveau?: string; duree_min?: number; bloc_semaines?: number };
  const parSemaine = new Map<number, typeof seances>();
  for (const s of seances ?? []) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s]);
  const semaines = [...parSemaine.keys()].sort((a, b) => a - b);
  const semaineCourante = (seances ?? []).find((s) => s.jour >= auj)?.semaine ?? semaines.at(-1);
  const faites = (seances ?? []).filter((s) => s.etat === "faite").length;
  const total = seances?.length ?? 0;

  return (
    <ModuleFrame module="sport" titre="Programme" sousTitre={prog.nom} gauche={retour}>
      <div className="mt-2 rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-3">Avancement</p>
            <p className="text-3xl font-semibold tracking-tight">{faites}<span className="text-base font-normal text-text-2"> / {total} séances</span></p>
          </div>
          <p className="text-right text-xs text-text-2">
            {new Date(prog.debut + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} → {prog.fin ? new Date(prog.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "…"}
          </p>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-accent" style={{ width: `${total ? (faites / total) * 100 : 0}%` }} /></div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-surface-3 px-2.5 py-1">{r.salle ?? 0} salle + {r.boxe ?? 0} boxe / sem.</span>
          {r.objectif && <span className="rounded-full bg-surface-3 px-2.5 py-1">{LIBELLES.objectif[r.objectif] ?? r.objectif}</span>}
          {r.niveau && <span className="rounded-full bg-surface-3 px-2.5 py-1">{LIBELLES.niveau[r.niveau] ?? r.niveau}</span>}
          {r.duree_min && <span className="rounded-full bg-surface-3 px-2.5 py-1">{r.duree_min} min</span>}
          <span className="rounded-full bg-surface-3 px-2.5 py-1">blocs de {r.bloc_semaines ?? 4} sem.</span>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-2">Chaque bloc : 3 semaines de progression (volume puis charge) et 1 semaine de décharge. Les exercices tournent d’un bloc à l’autre.</p>

      <div className="mt-3 space-y-2">
        {semaines.map((n) => {
          const ss = parSemaine.get(n) ?? [];
          const bloc = ss[0]?.bloc ?? Math.ceil(n / 4);
          const ouverte = n === semaineCourante;
          const nbFaites = ss.filter((s) => s.etat === "faite").length;
          const focus = ss.find((s) => s.type !== "boxe")?.focus ?? ss[0]?.focus ?? null;
          return (
            <details key={n} open={ouverte} className="group rounded-lg border border-border bg-surface-2">
              <summary className="tap flex cursor-pointer list-none items-center gap-3 px-4">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${ouverte ? "bg-accent text-white" : "bg-surface-3"}`}>{n}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Semaine {n} <span className="text-text-3">· Bloc {bloc}</span></p>
                  <p className="truncate text-xs text-text-2">{libelleFocus(focus) ?? ""} · {new Date(ss[0].jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</p>
                </div>
                <span className="text-xs text-text-2">{nbFaites}/{ss.length}</span>
                <Icon name="expand_more" size={20} className="text-text-3 transition-transform group-open:rotate-180" />
              </summary>
              <ul className="border-t border-border">
                {ss.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sport/seance/${s.id}`} className="tap flex items-center gap-3 px-4 active:opacity-80">
                      <Icon name={s.etat === "faite" ? "check_circle" : s.type === "boxe" ? "sports_mma" : "fitness_center"} size={20} filled={s.etat === "faite"}
                        className={s.etat === "faite" ? "text-success" : s.jour === auj ? "text-accent" : "text-text-3"} />
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${s.jour === auj ? "font-semibold" : ""}`}>{s.titre ?? libelleType(s.type)}</p>
                        <p className="text-xs text-text-3">{new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} · {s.duree_min} min{s.etat === "faite" ? ` · ${s.kcal} kcal` : ""}</p>
                      </div>
                      <Icon name="chevron_right" size={18} className="text-text-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          );
        })}
      </div>

      <Link href="/reglages/sport" className="tap mt-4 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 text-sm">
        <span className="flex items-center gap-2 text-text-2"><Icon name="tune" size={20} /> Modifier les paramètres / régénérer</span>
        <Icon name="chevron_right" size={18} className="text-text-3" />
      </Link>
    </ModuleFrame>
  );
}
