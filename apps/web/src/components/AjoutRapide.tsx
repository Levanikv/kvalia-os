"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./Icon";

/** Événement écouté par `FournisseurAjout` (nutrition/layout) : ouvrir la feuille d'ajout sur le scan ou la photo. */
export const EVENEMENT_AJOUT = "kvalia:ajout-repas";
export type DemandeAjout = { mode: "scan" | "photo" };

/** Jour affiché par l'écran (`?jour=`), lu au moment du geste — pas de hook, donc pas de frontière Suspense à poser. */
function jourAffiche(): string | null {
  const j = new URLSearchParams(window.location.search).get("jour");
  return j && /^\d{4}-\d{2}-\d{2}$/.test(j) ? j : null;
}

const ACTIONS = [
  { cle: "photo", label: "Photo du repas", icone: "photo_camera" },
  { cle: "scan", label: "Scanner un produit", icone: "barcode_scanner" },
  { cle: "repas", label: "Ajouter à un repas", icone: "restaurant" },
] as const;

/**
 * Le « + » de Nutrition : il se déploie en trois gestes — photo du repas, scan du code-barres, ajout à un repas
 * (page dédiée : idées selon les calories, recettes, aliments). L'écran se voile, la barre s'efface, les actions
 * montent en cascade depuis le bouton, qui tourne en croix. Tap sur le voile ou Échap : tout se replie.
 */
export function AjoutRapide() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  }, [ouvert]);

  const choisir = (cle: (typeof ACTIONS)[number]["cle"]) => {
    setOuvert(false);
    if (cle === "repas") {
      const jour = jourAffiche();
      return router.push(jour ? `/nutrition/ajouter?jour=${jour}` : "/nutrition/ajouter");
    }
    // Synchrone, dans le geste : l'appareil photo du téléphone ne s'ouvre que depuis un tap.
    window.dispatchEvent(new CustomEvent<DemandeAjout>(EVENEMENT_AJOUT, { detail: { mode: cle } }));
  };

  return (
    <div className="ajout-rapide" data-ouvert={ouvert}>
      {ouvert && (
        <>
          <button type="button" aria-label="Fermer" onClick={() => setOuvert(false)} className="ajout-voile" />
          <ul className="ajout-actions" id="ajout-rapide-actions">
            {ACTIONS.map((a, i) => (
              <li key={a.cle} style={{ "--i": ACTIONS.length - 1 - i } as React.CSSProperties}>
                <button type="button" onClick={() => choisir(a.cle)} className="ajout-action">
                  <span className="ajout-etiquette">{a.label}</span>
                  <span className="ajout-pastille">
                    <Icon name={a.icone} size={24} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-label={ouvert ? "Fermer l’ajout rapide" : "Ajouter un repas"}
        aria-expanded={ouvert}
        aria-controls="ajout-rapide-actions"
        className="kv-iconbtn kv-iconbtn-primary kv-iconbtn-lg kv-fab"
      >
        <span className="ajout-plus flex">
          <Icon name="add" size={30} />
        </span>
      </button>
    </div>
  );
}
