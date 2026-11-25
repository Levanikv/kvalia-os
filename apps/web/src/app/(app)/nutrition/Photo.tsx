"use client";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ajusterElement, type ElementEstime, type EstimationRepas } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { estimerPhotoAction } from "./actions";

/**
 * Photo d'un repas → estimation par le modèle de vision (`estimer_repas_photo`) : la photo est réduite sur le
 * téléphone, analysée côté serveur, puis chaque aliment détecté s'ajuste (grammes → calories et macros suivent) ou
 * se retire avant l'ajout au journal. Une précision (« cuit à l'huile », « riz complet ») relance l'analyse.
 */

const nf = (n: number) => n.toLocaleString("fr-FR");
const COTE_MAX = 1280;
const CONFIANCE = {
  haute: ["Estimation fiable", "kv-tag-success"],
  moyenne: ["Estimation moyenne", "kv-tag-neutral"],
  faible: ["Estimation incertaine", "kv-tag-warning"],
} as const;

/** Réduit la photo (1 280 px au plus, JPEG) : assez pour reconnaître une assiette, léger à envoyer. */
async function reduire(fichier: File): Promise<string> {
  const image = await createImageBitmap(fichier, { imageOrientation: "from-image" });
  const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
  const toile = document.createElement("canvas");
  toile.width = Math.round(image.width * echelle);
  toile.height = Math.round(image.height * echelle);
  toile.getContext("2d")?.drawImage(image, 0, 0, toile.width, toile.height);
  image.close();
  return toile.toDataURL("image/jpeg", 0.82).split(",")[1] ?? "";
}

type Props = {
  fichier: File;
  occupe: boolean;
  onRetour: () => void;
  onAjouter: (elements: ElementEstime[], plat: string) => void;
};

export function Photo({ fichier, occupe, onRetour, onAjouter }: Props) {
  const apercu = useMemo(() => URL.createObjectURL(fichier), [fichier]);
  const [estimation, setEstimation] = useState<EstimationRepas | null>(null);
  const [elements, setElements] = useState<ElementEstime[]>([]);
  const [erreur, setErreur] = useState<string | null>(null);
  const [precision, setPrecision] = useState("");
  const [analyse, lancer] = useTransition();

  const analyser = (avecPrecision?: string) =>
    lancer(async () => {
      setErreur(null);
      try {
        const image = await reduire(fichier);
        const r = await estimerPhotoAction(image, avecPrecision);
        if (!r.ok) return setErreur(r.erreur);
        setEstimation(r.valeur);
        setElements(r.valeur.elements);
      } catch {
        setErreur("Cette photo n’a pas pu être lue. Reprends-la, ou passe par la recherche.");
      }
    });

  // Une analyse par photo choisie.
  useEffect(() => {
    analyser();
    return () => URL.revokeObjectURL(apercu);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `analyser` ne dépend que de `fichier`
  }, [fichier, apercu]);

  const total = elements.reduce((a, e) => ({ kcal: a.kcal + e.kcal, prot: a.prot + e.prot, gluc: a.gluc + e.gluc, lip: a.lip + e.lip }), {
    kcal: 0,
    prot: 0,
    gluc: 0,
    lip: 0,
  });
  const [libelleConfiance, tonConfiance] = CONFIANCE[estimation?.confiance ?? "moyenne"];

  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <div className="flex items-center gap-[var(--inline-lg)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- aperçu local (blob) de la photo qui vient d'être prise */}
        <img src={apercu} alt="" className="h-20 w-20 shrink-0 rounded-[var(--radius-tile)] object-cover" />
        <div className="min-w-0 flex-1">
          {analyse ? (
            <>
              <p className="type-title-md">J’analyse ton assiette…</p>
              <p className="type-body-sm text-fg-secondary">Aliments, quantités, calories : quelques secondes.</p>
            </>
          ) : estimation ? (
            <>
              <p className="type-title-md">{estimation.plat}</p>
              <span className={`kv-tag ${tonConfiance}`}>{libelleConfiance}</span>
            </>
          ) : (
            <p className="type-title-md">Analyse impossible</p>
          )}
        </div>
      </div>
      {erreur && <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>}

      {estimation && !analyse && (
        <>
          {estimation.remarque && <p className="type-body-sm text-fg-secondary">{estimation.remarque}</p>}
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
            {elements.map((e, i) => (
              <li
                key={`${e.libelle}-${i}`}
                className="flex items-center gap-[var(--inline-md)] border-b border-line-subtle px-[var(--inset-sm)] py-[var(--inset-xs)] last:border-b-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-title-sm">{e.libelle}</span>
                  <span className="block truncate kv-mono">
                    {nf(e.kcal)} kcal · P {nf(Math.round(e.prot))} · G {nf(Math.round(e.gluc))} · L {nf(Math.round(e.lip))}
                  </span>
                </span>
                <label className="flex shrink-0 items-baseline gap-[var(--inline-xs)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-xs)] py-[var(--stack-xs)]">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    value={e.quantite_g || ""}
                    onChange={(ev) => {
                      const g = Math.max(0, Math.min(3000, Number(ev.target.value) || 0));
                      const origine = estimation.elements.find((o) => o.libelle === e.libelle) ?? e;
                      setElements((liste) => liste.map((x, j) => (j === i ? ajusterElement(origine, g) : x)));
                    }}
                    onFocus={(ev) => ev.target.select()}
                    className="w-[4ch] bg-transparent text-right type-label-lg tabular-nums outline-none"
                    aria-label={`Quantité de ${e.libelle} en grammes`}
                  />
                  <span className="kv-mono">g</span>
                </label>
                <button
                  type="button"
                  onClick={() => setElements((liste) => liste.filter((_, j) => j !== i))}
                  aria-label={`Retirer ${e.libelle}`}
                  className="tap shrink-0 text-icon-tertiary"
                >
                  <Icon name="close" size={20} />
                </button>
              </li>
            ))}
          </ul>

          <dl className="grid grid-cols-4 gap-[var(--inline-sm)]">
            {[
              ["Calories", Math.round(total.kcal), "kcal"],
              ["Protéines", Math.round(total.prot), "g"],
              ["Glucides", Math.round(total.gluc), "g"],
              ["Lipides", Math.round(total.lip), "g"],
            ].map(([k, v, u]) => (
              <div key={String(k)} className="kv-stat">
                <dt className="kv-overline">{k}</dt>
                <dd className="kv-stat-row">
                  <span className="type-title-md tabular-nums">{nf(Number(v))}</span>
                  <span className="kv-mono">{u}</span>
                </dd>
              </div>
            ))}
          </dl>

          <form
            className="flex gap-[var(--inline-sm)]"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (precision.trim()) analyser(precision.trim());
            }}
          >
            <label className="kv-field-box min-w-0 flex-1">
              <input
                value={precision}
                onChange={(ev) => setPrecision(ev.target.value)}
                maxLength={300}
                placeholder="Préciser : riz complet, cuit à l’huile…"
                className="kv-field-input"
                enterKeyHint="send"
                aria-label="Préciser ce que la photo ne montre pas"
              />
            </label>
            <button
              type="submit"
              disabled={!precision.trim()}
              aria-label="Relancer l’analyse avec cette précision"
              className="kv-iconbtn shrink-0 border border-line-default"
            >
              <Icon name="refresh" size={22} />
            </button>
          </form>
        </>
      )}

      <div className="flex gap-[var(--inline-md)]">
        <button type="button" onClick={onRetour} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
          Retour
        </button>
        {estimation && !analyse ? (
          <button
            type="button"
            disabled={occupe || !elements.some((e) => e.quantite_g > 0)}
            onClick={() =>
              onAjouter(
                elements.filter((e) => e.quantite_g > 0),
                estimation.plat,
              )
            }
            className="kv-btn kv-btn-primary kv-btn-lg flex-[1.8]"
          >
            <span className="kv-btn-label">{occupe ? "…" : `Ajouter · ${nf(Math.round(total.kcal))} kcal`}</span>
          </button>
        ) : (
          !analyse && (
            <button type="button" onClick={() => analyser(precision.trim() || undefined)} className="kv-btn kv-btn-primary kv-btn-lg flex-[1.8]">
              <span className="kv-btn-label">Réessayer</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
