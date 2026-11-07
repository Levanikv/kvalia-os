"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ParametresNutrition } from "@kvalia/core";
import { enregistrerParametresNutritionAction } from "./actions";

export function FormulaireNutrition({ initial }: { initial: ParametresNutrition }) {
  const router = useRouter();
  const [p, setP] = useState(initial);
  const [, start] = useTransition();
  const [ok, setOk] = useState(false);

  return (
    <div className="flex flex-col gap-4 pt-2">
      <section className="rounded-lg border border-border bg-surface-2 p-4">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Cible de base (kcal / jour)<br /><span className="text-xs text-text-3">Sans séance : maintenance ou déficit</span></span>
          <input type="number" inputMode="numeric" step={50} min={1000} max={6000} value={p.cible_kcal}
            onChange={(e) => { setP({ ...p, cible_kcal: Number(e.target.value) }); setOk(false); }}
            className="w-28 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm outline-none focus:border-accent" />
        </label>
        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm">Protéines (g / jour)</span>
          <input type="number" inputMode="numeric" step={10} min={50} max={400} value={p.proteines_g}
            onChange={(e) => { setP({ ...p, proteines_g: Number(e.target.value) }); setOk(false); }}
            className="w-28 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm outline-none focus:border-accent" />
        </label>
        <label className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm">Ajouter les kcal brûlées en séance à la cible du jour</span>
          <input type="checkbox" checked={p.ajuster_avec_sport} onChange={(e) => { setP({ ...p, ajuster_avec_sport: e.target.checked }); setOk(false); }} className="h-6 w-6 accent-[var(--module-accent)]" />
        </label>
      </section>
      <button type="button" onClick={() => start(async () => { await enregistrerParametresNutritionAction(p); setOk(true); router.refresh(); })}
        className="tap rounded-full bg-accent font-semibold text-white">{ok ? "Enregistré ✓" : "Enregistrer"}</button>
    </div>
  );
}
