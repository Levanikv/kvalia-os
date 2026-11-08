"use client";
import { useOptimistic, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { cocherHabitude } from "../actions";

type H = { id: string; nom: string; moment: string; non_negociable: boolean; fait: boolean };
const MOMENTS: Record<string, string> = { matin: "Matin", midi: "Midi", soir: "Soir", coucher: "Coucher", libre: "Dans la journée" };

export function Habitudes({ jour, habitudes }: { jour: string; habitudes: H[] }) {
  const [optimistes, setOptimiste] = useOptimistic(habitudes, (etat, maj: { id: string; fait: boolean }) =>
    etat.map((h) => (h.id === maj.id ? { ...h, fait: maj.fait } : h)),
  );
  const [, startTransition] = useTransition();
  const faites = optimistes.filter((h) => h.fait).length;
  const groupes = new Map<string, H[]>();
  for (const h of optimistes) groupes.set(h.moment, [...(groupes.get(h.moment) ?? []), h]);

  if (optimistes.length === 0) {
    return <p className="py-10 text-center text-sm text-text-3">Aucune habitude. L’import des 17 habitudes Notion arrive en phase 1.</p>;
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <div className="flex items-center justify-between rounded-lg bg-accent-soft px-4 py-3">
        <span className="text-sm font-medium">
          {faites} / {optimistes.length} aujourd’hui
        </span>
        <div className="h-2 w-28 overflow-hidden rounded-full bg-surface">
          <div className="h-full bg-accent transition-all" style={{ width: `${(faites / optimistes.length) * 100}%` }} />
        </div>
      </div>
      {["matin", "midi", "soir", "coucher", "libre"]
        .filter((m) => groupes.has(m))
        .map((m) => (
          <section key={m}>
            <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-text-3">{MOMENTS[m]}</h2>
            <ul className="overflow-hidden rounded-lg border border-border bg-surface-2">
              {groupes.get(m)!.map((h) => (
                <li key={h.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        setOptimiste({ id: h.id, fait: !h.fait });
                        await cocherHabitude(h.id, jour, !h.fait);
                      })
                    }
                    className="tap flex w-full items-center gap-3 px-3 py-2 text-left"
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${h.fait ? "border-accent bg-accent text-white" : "border-border"}`}
                    >
                      {h.fait && <Icon name="check" size={16} />}
                    </span>
                    <span className={`flex-1 text-base ${h.fait ? "text-text-3" : ""}`}>{h.nom}</span>
                    {h.non_negociable && <Icon name="bolt" size={18} className="text-accent" />}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
