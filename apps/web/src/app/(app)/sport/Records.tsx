import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@kvalia/core";
import { nomAffiche } from "./lib";

type Db = SupabaseClient<Database>;

/** Records : les 3 exercices les plus chargés, leur progression sur la période et une mini-courbe des charges. */
export async function Records({ db, depuis, jusqua }: { db: Db; depuis: string; jusqua: string }) {
  const { data } = await db
    .from("exercices_seance")
    .select("exercice_id, charge_kg, seances!inner(jour), exercices_ref!exercices_seance_exercice_id_fkey(nom, nom_fr)")
    .not("charge_kg", "is", null)
    .gte("seances.jour", depuis)
    .limit(1000);
  type L = { jour: string };
  const parExo = new Map<string, { nom: string; points: Array<{ jour: string; kg: number }> }>();
  for (const x of data ?? []) {
    const ref = x.exercices_ref as unknown as { nom: string; nom_fr: string | null };
    const e = parExo.get(x.exercice_id) ?? { nom: nomAffiche(ref), points: [] };
    e.points.push({ jour: (x.seances as unknown as L).jour, kg: Number(x.charge_kg) });
    parExo.set(x.exercice_id, e);
  }
  const top = [...parExo.values()]
    .map((e) => {
      const pts = [...e.points].sort((a, b) => a.jour.localeCompare(b.jour));
      const max = Math.max(...pts.map((p) => p.kg));
      return { nom: e.nom, pts, max, gain: max - pts[0].kg };
    })
    .filter((e) => e.max > 0)
    .sort((a, b) => b.max - a.max)
    .slice(0, 3);
  if (top.length === 0) return null;
  const semaines = Math.max(1, Math.round((new Date(jusqua + "T12:00:00Z").getTime() - new Date(depuis + "T12:00:00Z").getTime()) / (7 * 86400000)));

  return (
    <section className="flex flex-col gap-[var(--stack-sm)]">
      <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
        <h2 className="type-title-lg">Records</h2>
        <Link href="/sport/historique" className="kv-mono underline-offset-2 hover:underline">
          {semaines} sem. · historique ›
        </Link>
      </div>
      <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default shadow-card">
        {top.map((r) => {
          const min = Math.min(...r.pts.map((p) => p.kg));
          const etendue = Math.max(1, r.max - min);
          const points = r.pts.map((p, i) => `${(i / Math.max(1, r.pts.length - 1)) * 70},${22 - ((p.kg - min) / etendue) * 20}`).join(" ");
          return (
            <li
              key={r.nom}
              className="flex items-center gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate type-title-sm">{r.nom}</span>
                <span className="kv-mono !text-feedback-success-text">
                  +{String(r.gain).replace(".", ",")} kg / {semaines} sem.
                </span>
              </span>
              <svg viewBox="0 0 70 24" className="h-6 w-[70px] shrink-0" aria-hidden>
                <polyline points={points} fill="none" className="stroke-action-primary" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="w-16 shrink-0 text-right">
                <span className="type-numeric-md">{String(r.max).replace(".", ",")}</span>
                <span className="kv-mono"> kg</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
