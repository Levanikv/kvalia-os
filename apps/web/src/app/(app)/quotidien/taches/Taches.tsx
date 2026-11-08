"use client";
import { useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { ajouterTache, faireTache } from "../actions";

export type TacheAffichee = { id: string; titre: string; due: string | null; priorite: "basse" | "normale" | "haute"; fait: boolean };

function libelleDate(due: string | null): string {
  if (!due) return "";
  const d = new Date(due + "T12:00:00");
  const auj = new Date();
  auj.setHours(12, 0, 0, 0);
  const diff = Math.round((d.getTime() - auj.getTime()) / 86_400_000);
  if (diff === 0) return "aujourd’hui";
  if (diff === 1) return "demain";
  if (diff < 0) return `en retard (${-diff} j)`;
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

export function Taches({ taches }: { taches: TacheAffichee[] }) {
  const [optimistes, setOptimiste] = useOptimistic(taches, (etat, maj: { id: string; fait: boolean }) =>
    etat.map((t) => (t.id === maj.id ? { ...t, fait: maj.fait } : t)),
  );
  const [, startTransition] = useTransition();
  const [titre, setTitre] = useState("");
  const [due, setDue] = useState("");

  const aFaire = optimistes.filter((t) => !t.fait);
  const faites = optimistes.filter((t) => t.fait);

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    await ajouterTache(titre.trim(), due || null);
    setTitre("");
    setDue("");
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <form onSubmit={ajouter} className="flex gap-2">
        <input
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Nouvelle tâche…"
          className="tap min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 text-base outline-none focus:border-accent"
        />
        <input
          value={due}
          onChange={(e) => setDue(e.target.value)}
          placeholder="demain"
          className="tap w-24 rounded-full border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={!titre.trim()}
          aria-label="Ajouter"
          className="tap flex w-11 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
        >
          <Icon name="add" />
        </button>
      </form>

      {aFaire.length === 0 && <p className="py-10 text-center text-sm text-text-3">Rien à faire. Profite.</p>}

      <ul className="overflow-hidden rounded-lg border border-border bg-surface-2">
        {aFaire.map((t) => (
          <Item
            key={t.id}
            t={t}
            onBasculer={() =>
              startTransition(async () => {
                setOptimiste({ id: t.id, fait: true });
                await faireTache(t.id, true);
              })
            }
          />
        ))}
      </ul>

      {faites.length > 0 && (
        <section>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-text-3">Faites · {faites.length}</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface-2 opacity-70">
            {faites.map((t) => (
              <Item
                key={t.id}
                t={t}
                onBasculer={() =>
                  startTransition(async () => {
                    setOptimiste({ id: t.id, fait: false });
                    await faireTache(t.id, false);
                  })
                }
              />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Item({ t, onBasculer }: { t: TacheAffichee; onBasculer: () => void }) {
  return (
    <li className="border-b border-border last:border-b-0">
      <button type="button" onClick={onBasculer} className="tap flex w-full items-center gap-3 px-3 py-2 text-left">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${t.fait ? "border-accent bg-accent text-white" : "border-border"}`}
        >
          {t.fait && <Icon name="check" size={16} />}
        </span>
        <span className={`min-w-0 flex-1 truncate text-base ${t.fait ? "line-through text-text-3" : ""}`}>{t.titre}</span>
        {t.priorite === "haute" && !t.fait && <Icon name="priority_high" size={18} className="text-danger" />}
        <span className="shrink-0 text-xs text-text-2">{libelleDate(t.due)}</span>
      </button>
    </li>
  );
}
