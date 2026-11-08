import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { libelleType } from "../lib";

const RESSENTI = ["", "😮‍💨", "😓", "🙂", "💪", "🔥"];

/** Historique : séances faites, groupées par mois, avec totaux (séances, kcal, minutes). */
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
        <Link href="/sport" className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour">
          <Icon name="arrow_back" size={24} />
        </Link>
      }
    >
      {seances.length === 0 ? (
        <p className="mt-10 text-center text-sm text-text-3">Rien pour l’instant. Ta première séance terminée apparaîtra ici.</p>
      ) : (
        <div className="mt-2 space-y-5">
          {[...parMois.entries()].map(([mois, ss]) => {
            const kcal = ss.reduce((a, s) => a + Number(s.kcal ?? 0), 0);
            const minutes = ss.reduce((a, s) => a + Number(s.duree_min ?? 0), 0);
            const titre = new Date(mois + "-15T12:00:00").toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
            return (
              <section key={mois}>
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold capitalize">{titre}</h2>
                  <p className="text-xs text-text-2">
                    {ss.length} séances · {kcal.toLocaleString("fr-FR")} kcal · {Math.round((minutes / 60) * 10) / 10} h
                  </p>
                </div>
                <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-2">
                  {ss.map((s) => (
                    <li key={s.id} className="border-b border-border last:border-b-0">
                      <Link href={`/sport/seance/${s.id}`} className="tap flex items-center gap-3 px-4 active:opacity-80">
                        <Icon name={s.type === "boxe" ? "sports_mma" : "fitness_center"} size={20} className="text-accent" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{s.titre ?? libelleType(s.type)}</p>
                          <p className="text-xs text-text-3">
                            {new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })} · {s.duree_min}{" "}
                            min
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">
                            {s.kcal} <span className="text-xs font-normal text-text-2">kcal</span>
                          </p>
                          {s.ressenti ? <p className="text-sm">{RESSENTI[s.ressenti]}</p> : null}
                        </div>
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
