"use client";
import { useOptimistic, useState, useTransition } from "react";
import { Icon } from "@/components/Icon";
import { ajouterArticles, cocherLigne, supprimerLigne } from "../actions";

export type LigneAffichee = {
  id: string;
  quantite: number;
  unite: string | null;
  coche: boolean;
  manque: boolean;
  origine: string;
  produit: string;
  rayon: string | null;
};

const ORIGINES: Record<string, string> = { agent: "agent", siri: "Siri", alexa: "Alexa", telegram: "Telegram", plan: "plan repas" };

export function ListeCourses({ listeId, lignes }: { listeId: string | null; lignes: LigneAffichee[] }) {
  const [optimistes, setOptimiste] = useOptimistic(lignes, (etat, maj: { id: string; coche: boolean }) =>
    etat.map((l) => (l.id === maj.id ? { ...l, coche: maj.coche } : l)),
  );
  const [, startTransition] = useTransition();
  const [texte, setTexte] = useState("");
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  const restantes = optimistes.filter((l) => !l.coche);
  const cochees = optimistes.filter((l) => l.coche);
  const parRayon = new Map<string, LigneAffichee[]>();
  for (const l of restantes) {
    const cle = l.rayon ?? "Sans rayon";
    parRayon.set(cle, [...(parRayon.get(cle) ?? []), l]);
  }

  function basculer(l: LigneAffichee) {
    startTransition(async () => {
      setOptimiste({ id: l.id, coche: !l.coche });
      await cocherLigne(l.id, !l.coche);
    });
  }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setAjoutEnCours(true);
    await ajouterArticles(texte);
    setTexte("");
    setAjoutEnCours(false);
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      <form onSubmit={ajouter} className="flex gap-2">
        <input
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          placeholder="2 skyr, riz 1 kg, œufs…"
          enterKeyHint="done"
          className="tap min-w-0 flex-1 rounded-full border border-border bg-surface-2 px-4 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={ajoutEnCours || !texte.trim()}
          aria-label="Ajouter"
          className="tap flex w-11 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
        >
          <Icon name="add" />
        </button>
      </form>

      {!listeId || optimistes.length === 0 ? (
        <p className="py-10 text-center text-sm text-text-3">Liste vide. Ajoute un article ici, ou dis-le à Claude.</p>
      ) : null}

      {[...parRayon].map(([rayon, items]) => (
        <section key={rayon}>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-text-3">{rayon}</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface-2">
            {items.map((l) => (
              <LigneItem key={l.id} ligne={l} onBasculer={() => basculer(l)} />
            ))}
          </ul>
        </section>
      ))}

      {cochees.length > 0 && (
        <section>
          <h2 className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-text-3">Dans le panier · {cochees.length}</h2>
          <ul className="overflow-hidden rounded-lg border border-border bg-surface-2 opacity-70">
            {cochees.map((l) => (
              <LigneItem key={l.id} ligne={l} onBasculer={() => basculer(l)} />
            ))}
          </ul>
        </section>
      )}

      {optimistes.length > 0 && <p className="text-center text-xs text-text-3">{restantes.length} à prendre · « Courses faites » arrive en phase 1</p>}
    </div>
  );
}

function LigneItem({ ligne: l, onBasculer }: { ligne: LigneAffichee; onBasculer: () => void }) {
  const [, startTransition] = useTransition();
  return (
    <li className="flex items-center border-b border-border last:border-b-0">
      <button type="button" onClick={onBasculer} className="tap flex min-w-0 flex-1 items-center gap-3 px-3 py-2 text-left">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${
            l.coche ? "border-accent bg-accent text-white" : "border-border"
          }`}
        >
          {l.coche && <Icon name="check" size={16} />}
        </span>
        <span className={`min-w-0 flex-1 truncate text-base ${l.coche ? "line-through text-text-3" : ""}`}>
          {l.produit}
          {l.manque && <span className="ml-2 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-medium text-danger">manque</span>}
        </span>
        <span className="shrink-0 text-sm text-text-2">
          {l.quantite}
          {l.unite ? ` ${l.unite}` : ""}
        </span>
        {ORIGINES[l.origine] && <span className="shrink-0 text-[10px] text-text-3">{ORIGINES[l.origine]}</span>}
      </button>
      <button type="button" aria-label="Retirer" onClick={() => startTransition(() => supprimerLigne(l.id))} className="tap px-3 text-text-3">
        <Icon name="close" size={18} />
      </button>
    </li>
  );
}
