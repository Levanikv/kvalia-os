"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { LIBELLES } from "@kvalia/core";
import { Icon } from "@/components/Icon";

type E = {
  id: string;
  nom: string;
  affiche: string;
  partie_corps: string | null;
  equipement: string | null;
  difficulte: string | null;
  image_url: string | null;
  muscles: string[];
  compose: boolean;
};

const PARTIES = ["chest", "back", "shoulders", "upper arms", "lower arms", "upper legs", "lower legs", "waist", "hips", "cardio"];

export function Bibliotheque({ exercices }: { exercices: E[] }) {
  const [q, setQ] = useState("");
  const [partie, setPartie] = useState<string | null>(null);
  const [materiel, setMateriel] = useState<string | null>(null);

  const materiels = useMemo(() => [...new Set(exercices.map((e) => e.equipement).filter(Boolean) as string[])].sort(), [exercices]);
  const liste = useMemo(() => {
    const t = q.trim().toLowerCase();
    return exercices.filter(
      (e) =>
        (!partie || e.partie_corps === partie) &&
        (!materiel || e.equipement === materiel) &&
        (!t || e.affiche.toLowerCase().includes(t) || e.nom.toLowerCase().includes(t) || e.muscles.some((m) => m.toLowerCase().includes(t))),
    );
  }, [exercices, q, partie, materiel]);

  return (
    <div className="pt-2">
      <label className="flex items-center gap-2 rounded-full bg-surface-default px-4">
        <Icon name="search" size={20} className="text-fg-tertiary" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (développé, lats, squat…)"
          className="tap w-full bg-transparent text-sm outline-none"
        />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Effacer">
            <Icon name="close" size={18} className="text-fg-tertiary" />
          </button>
        )}
      </label>

      <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip actif={!partie} onClick={() => setPartie(null)}>
          Tout
        </Chip>
        {PARTIES.map((p) => (
          <Chip key={p} actif={partie === p} onClick={() => setPartie(partie === p ? null : p)}>
            {LIBELLES.partie[p] ?? p}
          </Chip>
        ))}
      </div>
      <div className="-mx-4 mt-1.5 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <Chip actif={!materiel} onClick={() => setMateriel(null)} discret>
          Tout matériel
        </Chip>
        {materiels.map((m) => (
          <Chip key={m} actif={materiel === m} onClick={() => setMateriel(materiel === m ? null : m)} discret>
            {LIBELLES.materiel[m] ?? m}
          </Chip>
        ))}
      </div>

      <p className="mt-3 text-xs text-fg-tertiary">
        {liste.length} exercice{liste.length > 1 ? "s" : ""}
      </p>
      <ul className="mt-2 grid grid-cols-2 gap-3 lg:grid-cols-3">
        {liste.map((e) => (
          <li key={e.id}>
            <Link
              href={`/sport/exercices/${e.id}`}
              className="block overflow-hidden rounded-lg border border-line-default bg-surface-default active:opacity-80"
            >
              <div className="relative aspect-[4/3] bg-surface-sunken">
                {e.image_url && <img src={e.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />}
                <span className="kv-tag kv-tag-neutral absolute bottom-1.5 left-1.5">{LIBELLES.partie[e.partie_corps ?? ""] ?? e.partie_corps}</span>
              </div>
              <div className="p-2.5">
                <p className="truncate text-sm font-medium">{e.affiche}</p>
                <p className="truncate text-[11px] text-fg-tertiary">
                  {LIBELLES.materiel[e.equipement ?? ""] ?? e.equipement}
                  {e.compose ? " · poly" : ""}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chip({ actif, onClick, children, discret }: { actif: boolean; onClick: () => void; children: React.ReactNode; discret?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${actif ? (discret ? "bg-surface-sunken text-fg-primary ring-1 ring-line-default" : "bg-action-primary text-fg-on-brand") : discret ? "text-fg-tertiary" : "bg-surface-default text-fg-secondary"}`}
    >
      {children}
    </button>
  );
}
