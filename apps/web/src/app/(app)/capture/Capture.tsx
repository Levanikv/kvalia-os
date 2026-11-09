"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { ajouterArticles, ajouterTache } from "../quotidien/actions";

export function Capture({ initial }: { initial: string }) {
  const router = useRouter();
  const [texte, setTexte] = useState(initial);
  const [etat, setEtat] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);

  async function courses() {
    setEnCours(true);
    const { ajoutes } = await ajouterArticles(texte);
    setEnCours(false);
    setEtat(`${ajoutes} article${ajoutes > 1 ? "s" : ""} ajouté${ajoutes > 1 ? "s" : ""} à la liste.`);
    setTexte("");
    setTimeout(() => router.push("/quotidien/courses"), 600);
  }

  async function tache() {
    setEnCours(true);
    await ajouterTache(texte.trim(), null);
    setEnCours(false);
    setEtat("Tâche créée.");
    setTexte("");
    setTimeout(() => router.push("/quotidien/taches"), 600);
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <textarea
        autoFocus
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={4}
        placeholder="2 skyr, riz 1 kg, œufs&#10;ou : Appeler le garage"
        className="w-full rounded-lg border border-line-default bg-surface-default p-4 text-lg outline-none focus:border-action-primary"
      />
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={enCours || !texte.trim()}
          onClick={courses}
          className="tap flex items-center justify-center gap-2 rounded-md bg-action-primary font-medium text-fg-on-brand disabled:opacity-40"
        >
          <Icon name="shopping_cart" size={20} /> Aux courses
        </button>
        <button
          type="button"
          disabled={enCours || !texte.trim()}
          onClick={tache}
          className="tap flex items-center justify-center gap-2 rounded-md border border-line-default bg-surface-default font-medium disabled:opacity-40"
        >
          <Icon name="task_alt" size={20} /> En tâche
        </button>
      </div>
      {etat && <p className="text-center text-sm text-feedback-success-text">{etat}</p>}
      <p className="text-center text-xs text-fg-tertiary">
        Le micro et la phrase libre vers l’agent (« il me manque du skyr ») arrivent en phase 1. En attendant : claude.ai avec le connecteur KVALIA OS.
      </p>
    </div>
  );
}
