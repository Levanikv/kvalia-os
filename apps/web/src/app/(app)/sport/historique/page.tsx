import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { libelleType } from "../lib";

const RESSENTI = ["", "😮‍💨", "😓", "🙂", "💪", "🔥"];

/** Historique : séances faites, groupées par mois, avec totaux (séances, kcal, heures). Ouvert depuis Programme › Plan et les records. */
export default async function Page() {
  const { supabase } = await session();
  const { data } = await supabase
    .from("seances")
    .select("id, jour, type, titre, kcal, duree_min, ressenti, faite_le")
    .eq("etat", "faite")
    .order("jour", { ascending: false })
    .limit(200);
  const seances = data ?? [];
  const parMois = new Map<string, typeof seances>();
  for (const s of seances) {
    const k = s.jour.slice(0, 7);
    parMois.set(k, [...(parMois.get(k) ?? []), s]);
  }

  return (
    <ModuleFrame
      module="sport"
      titre="Historique"
      sousTitre={`${seances.length} séance${seances.length > 1 ? "s" : ""} terminée${seances.length > 1 ? "s" : ""}`}
      gauche={
        <Link href="/sport/programme?vue=plan" className="kv-iconbtn" aria-label="Retour au programme">
          <Icon name="chevron_left" size={24} />
        </Link>
      }
    >
      {seances.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
          Rien pour l’instant. Ta première séance terminée apparaîtra ici.
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--stack-xl)]">
          {[...parMois.entries()].map(([mois, ss]) => {
            const kcal = ss.reduce((a, s) => a + Number(s.kcal ?? 0), 0);
            const minutes = ss.reduce((a, s) => a + Number(s.duree_min ?? 0), 0);
            const titre = new Date(mois + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            return (
              <section key={mois} className="flex flex-col gap-[var(--stack-sm)]">
                <div className="flex items-baseline justify-between gap-[var(--inline-md)] px-[var(--inline-xs)]">
                  <h2 className="type-title-lg capitalize">{titre}</h2>
                  <p className="kv-mono">
                    {ss.length} séance{ss.length > 1 ? "s" : ""} · {kcal.toLocaleString("fr-FR")} kcal ·{" "}
                    {String(Math.round((minutes / 60) * 10) / 10).replace(".", ",")} h
                  </p>
                </div>
                <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
                  {ss.map((s) => (
                    <li key={s.id} className="border-b border-line-subtle last:border-b-0">
                      <Link href={`/sport/seance/${s.id}`} className="tap flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
                          <Icon name={s.type === "boxe" ? "sports_mma" : "fitness_center"} size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate type-title-sm">{s.titre ?? libelleType(s.type)}</span>
                          <span className="block kv-mono">
                            {new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {s.duree_min}{" "}
                            min
                            {s.ressenti ? ` · ${RESSENTI[s.ressenti]}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="type-label-lg tabular-nums">{Number(s.kcal ?? 0).toLocaleString("fr-FR")}</span>{" "}
                          <span className="kv-mono">kcal</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </ModuleFrame>
  );
}
