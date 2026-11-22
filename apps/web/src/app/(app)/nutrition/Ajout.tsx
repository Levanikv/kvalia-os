"use client";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { LIBELLES_REPAS, REPAS, type AlimentSortie, type Repas } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { ajouterAuJournalAction, chercherAlimentAction } from "./actions";

/**
 * Ajout d'un aliment au journal (feuille plein-hauteur, ouverte depuis la barre d'action ou depuis un repas) :
 * choix du repas, recherche dans la base (aliments génériques tout de suite, produits de marque d'Open Food Facts
 * juste après), récents, saisie rapide de calories ; puis la quantité, avec les macros qui suivent.
 * `FournisseurAjout` partage l'ouverture de la feuille entre la barre d'action et la liste des repas.
 */

type Contexte = { ouvrir: (repas?: Repas) => void };
const ContexteAjout = createContext<Contexte>({ ouvrir: () => {} });
export const useAjout = () => useContext(ContexteAjout);

const nf = (n: number) => n.toLocaleString("fr-FR");
/** Au-dessus de la barre de l'app et de la barre d'action. */
const BAS_TOAST = "calc(var(--page-tabbar-offset) + var(--tabbar-h) + var(--control-xl) + var(--stack-md))";

type Props = { jour: string; repasDuMoment: Repas; recents: AlimentSortie[]; children: ReactNode };

export function FournisseurAjout({ jour, repasDuMoment, recents, children }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const [repas, setRepas] = useState<Repas>(repasDuMoment);
  const [toast, setToast] = useState<string | null>(null);
  const ouvrir = useCallback(
    (r?: Repas) => {
      setRepas(r ?? repasDuMoment);
      setOuvert(true);
    },
    [repasDuMoment],
  );
  const valeur = useMemo(() => ({ ouvrir }), [ouvrir]);
  return (
    <ContexteAjout.Provider value={valeur}>
      {children}
      {ouvert && (
        <FeuilleAjout
          jour={jour}
          repas={repas}
          setRepas={setRepas}
          recents={recents}
          onFermer={() => setOuvert(false)}
          onAjoute={(message) => {
            setOuvert(false);
            setToast(message);
          }}
        />
      )}
      <Toast message={toast} onFermer={() => setToast(null)} bas={BAS_TOAST} />
    </ContexteAjout.Provider>
  );
}

/** Bouton de la barre d'action : « Ajouter un aliment ». */
export function BoutonAjout() {
  const { ouvrir } = useAjout();
  return (
    <button type="button" onClick={() => ouvrir()} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block shadow-raised">
      <Icon name="add" size={22} />
      <span className="kv-btn-label">Ajouter un aliment</span>
    </button>
  );
}

function FeuilleAjout({
  jour,
  repas,
  setRepas,
  recents,
  onFermer,
  onAjoute,
}: {
  jour: string;
  repas: Repas;
  setRepas: (r: Repas) => void;
  recents: AlimentSortie[];
  onFermer: () => void;
  onAjoute: (message: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [resultats, setResultats] = useState<AlimentSortie[] | null>(null);
  const [etat, setEtat] = useState<"repos" | "base" | "marques" | "hors_ligne">("repos");
  const [choisi, setChoisi] = useState<AlimentSortie | null>(null);
  const [grammes, setGrammes] = useState(100);
  const [libre, setLibre] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, start] = useTransition();
  const dernier = useRef("");

  // Recherche en deux temps : la base (immédiat), puis Open Food Facts (produits de marque) si la saisie n'a pas changé.
  useEffect(() => {
    const requete = q.trim();
    dernier.current = requete;
    // Moins de 2 caractères : pas de recherche (l'affichage ignore alors les anciens résultats, voir `actif`).
    if (requete.length < 2) return;
    const t = setTimeout(async () => {
      setEtat("base");
      const base = await chercherAlimentAction(requete, false);
      if (dernier.current !== requete) return;
      if (base.ok) setResultats(base.valeur.aliments);
      setEtat("marques");
      const tout = await chercherAlimentAction(requete, true);
      if (dernier.current !== requete) return;
      if (tout.ok) {
        setResultats(tout.valeur.aliments);
        setEtat(tout.valeur.open_food_facts === "indisponible" ? "hors_ligne" : "repos");
      } else setEtat("repos");
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const choisir = (a: AlimentSortie) => {
    setChoisi(a);
    setGrammes(a.portion_g ?? 100);
    setErreur(null);
  };
  const ajouter = (entree: Record<string, unknown>, nom: string) =>
    start(async () => {
      setErreur(null);
      const r = await ajouterAuJournalAction({ jour, repas, ...entree });
      if (!r.ok) return setErreur(r.erreur);
      router.refresh();
      onAjoute(`${nom} ajouté · ${nf(r.valeur.kcal)} kcal`);
    });

  const actif = q.trim().length >= 2;
  const trouves = actif ? resultats : null;
  const etatAffiche = actif ? etat : "repos";
  const liste = trouves ?? (actif ? [] : recents);
  const f = grammes / 100;

  return (
    <BottomSheet
      ouvert
      onFermer={onFermer}
      titre={choisi ? "Quelle quantité ?" : libre ? "Saisie rapide" : "Ajouter un aliment"}
      pleine
      module="nutrition"
      pied={
        choisi ? (
          <div className="flex gap-[var(--inline-md)]">
            <button type="button" onClick={() => setChoisi(null)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
              Retour
            </button>
            <button
              type="button"
              disabled={occupe || grammes <= 0}
              onClick={() => ajouter({ aliment_id: choisi.id, quantite_g: grammes }, choisi.nom)}
              className="kv-btn kv-btn-primary kv-btn-lg flex-[1.8]"
            >
              <span className="kv-btn-label">{occupe ? "…" : `Ajouter · ${nf(Math.round(choisi.kcal * f))} kcal`}</span>
            </button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-[var(--stack-md)] pt-[var(--stack-xs)]">
        {/* Repas */}
        <div className="-mx-5 flex gap-[var(--inline-sm)] overflow-x-auto px-5 pb-1" role="radiogroup" aria-label="Repas">
          {REPAS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={repas === r}
              onClick={() => setRepas(r)}
              className={`kv-chip shrink-0 ${repas === r ? "is-on" : ""}`}
            >
              {LIBELLES_REPAS[r]}
            </button>
          ))}
        </div>
        {erreur && (
          <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>
        )}

        {choisi ? (
          <Quantite aliment={choisi} grammes={grammes} setGrammes={setGrammes} />
        ) : libre ? (
          <SaisieLibre occupe={occupe} onRetour={() => setLibre(false)} onAjouter={(e) => ajouter(e, String(e.libelle))} />
        ) : (
          <>
            <label className="kv-field-box">
              <Icon name="search" size={20} className="text-icon-tertiary" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Skyr, riz basmati, code-barres…"
                className="kv-field-input"
                autoFocus
                enterKeyHint="search"
                aria-label="Chercher un aliment"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="Effacer" className="text-icon-tertiary">
                  <Icon name="close" size={18} />
                </button>
              )}
            </label>

            <div className="flex items-center justify-between px-[var(--inline-xs)]">
              <span className="kv-overline">
                {trouves
                  ? `${trouves.length} résultat${trouves.length > 1 ? "s" : ""}`
                  : recents.length && !actif
                    ? "Récents"
                    : "3 000 aliments · produits de marque"}
              </span>
              <span className="kv-mono" aria-live="polite">
                {etatAffiche === "base"
                  ? "recherche…"
                  : etatAffiche === "marques"
                    ? "+ produits de marque…"
                    : etatAffiche === "hors_ligne"
                      ? "marques indisponibles"
                      : ""}
              </span>
            </div>

            {liste.length > 0 ? (
              <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
                {liste.map((a) => (
                  <li key={a.id} className="border-b border-line-subtle last:border-b-0">
                    <button
                      type="button"
                      onClick={() => choisir(a)}
                      className="tap flex w-full items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-xs)] text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate type-title-sm">{a.nom}</span>
                        <span className="block truncate kv-mono">
                          {[a.marque, `P ${nf(a.prot)} · G ${nf(a.gluc)} · L ${nf(a.lip)}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block type-label-lg tabular-nums">{nf(a.kcal)}</span>
                        <span className="block kv-mono">kcal / 100 g</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
                {trouves
                  ? "Rien trouvé. Essaie un mot plus simple, le code-barres, ou la saisie rapide."
                  : "Tape le nom d’un aliment ou d’un produit : la base couvre les aliments courants et les produits de marque."}
              </p>
            )}

            <button type="button" onClick={() => setLibre(true)} className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
              <Icon name="bolt" size={20} />
              <span className="kv-btn-label">Saisie rapide (calories)</span>
            </button>
          </>
        )}
      </div>
    </BottomSheet>
  );
}

/** Quantité d'un aliment : grammes, raccourcis (portion usuelle, 50 à 250 g) et macros qui suivent. */
function Quantite({ aliment: a, grammes, setGrammes }: { aliment: AlimentSortie; grammes: number; setGrammes: (g: number) => void }) {
  const f = grammes / 100;
  const raccourcis = [...new Set([a.portion_g, 50, 100, 150, 200, 250].filter((x): x is number => !!x))].slice(0, 6);
  return (
    <div className="flex flex-col gap-[var(--stack-lg)]">
      <div>
        <p className="type-title-lg">{a.nom}</p>
        <p className="kv-mono">
          {[a.marque, `${nf(a.kcal)} kcal pour 100 g`, a.source === "ciqual" ? "table CIQUAL" : a.source === "off" ? "Open Food Facts" : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>
      <div className="flex items-center justify-between rounded-[var(--radius-input)] bg-surface-container-sunken p-[var(--inset-xs)]">
        <button type="button" onClick={() => setGrammes(Math.max(5, grammes - 10))} className="kv-iconbtn bg-surface-container-default" aria-label="Moins 10 g">
          <Icon name="remove" size={20} />
        </button>
        <span className="flex items-baseline gap-[var(--inline-xs)]">
          <input
            type="number"
            inputMode="decimal"
            min={1}
            value={grammes}
            onChange={(e) => setGrammes(Math.max(0, Math.min(5000, Number(e.target.value) || 0)))}
            onFocus={(e) => e.target.select()}
            style={{ width: `${Math.max(2, String(grammes).length) + 0.5}ch` }}
            className="bg-transparent text-right type-display-md tabular-nums outline-none"
            aria-label="Quantité en grammes"
          />
          <span className="type-title-md text-fg-secondary">g</span>
        </span>
        <button type="button" onClick={() => setGrammes(grammes + 10)} className="kv-iconbtn bg-surface-container-default" aria-label="Plus 10 g">
          <Icon name="add" size={20} />
        </button>
      </div>
      <div className="flex flex-wrap gap-[var(--inline-sm)]">
        {raccourcis.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={grammes === g}
            onClick={() => setGrammes(g)}
            className={`kv-chip tabular-nums ${grammes === g ? "is-on" : ""}`}
          >
            {g === a.portion_g ? `1 portion · ${nf(g)} g` : `${nf(g)} g`}
          </button>
        ))}
      </div>
      <dl className="grid grid-cols-4 gap-[var(--inline-sm)]">
        {[
          ["Calories", Math.round(a.kcal * f), "kcal"],
          ["Protéines", Math.round(a.prot * f * 10) / 10, "g"],
          ["Glucides", Math.round(a.gluc * f * 10) / 10, "g"],
          ["Lipides", Math.round(a.lip * f * 10) / 10, "g"],
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
    </div>
  );
}

/** Saisie rapide : un nom et des calories (protéines facultatives), quand on ne veut pas chercher. */
function SaisieLibre({ occupe, onRetour, onAjouter }: { occupe: boolean; onRetour: () => void; onAjouter: (e: Record<string, unknown>) => void }) {
  const [libelle, setLibelle] = useState("");
  const [kcal, setKcal] = useState("");
  const [prot, setProt] = useState("");
  const champ =
    "h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring";
  const valide = libelle.trim().length > 0 && Number(kcal) > 0;
  return (
    <div className="flex flex-col gap-[var(--stack-md)]">
      <label className="flex flex-col gap-[var(--stack-xs)]">
        <span className="px-[var(--inline-xs)] type-title-sm">Quoi ?</span>
        <input value={libelle} onChange={(e) => setLibelle(e.target.value)} maxLength={120} placeholder="Ex. Plat du restaurant" className={champ} autoFocus />
      </label>
      <div className="grid grid-cols-2 gap-[var(--inline-md)]">
        <label className="flex flex-col gap-[var(--stack-xs)]">
          <span className="px-[var(--inline-xs)] type-title-sm">Calories</span>
          <input value={kcal} onChange={(e) => setKcal(e.target.value)} type="number" inputMode="numeric" min={0} placeholder="kcal" className={champ} />
        </label>
        <label className="flex flex-col gap-[var(--stack-xs)]">
          <span className="px-[var(--inline-xs)] type-title-sm">Protéines</span>
          <input
            value={prot}
            onChange={(e) => setProt(e.target.value)}
            type="number"
            inputMode="decimal"
            min={0}
            placeholder="g (facultatif)"
            className={champ}
          />
        </label>
      </div>
      <div className="flex gap-[var(--inline-md)]">
        <button type="button" onClick={onRetour} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
          Retour
        </button>
        <button
          type="button"
          disabled={!valide || occupe}
          onClick={() => onAjouter({ libelle: libelle.trim(), kcal: Number(kcal), ...(Number(prot) > 0 ? { prot: Number(prot) } : {}) })}
          className="kv-btn kv-btn-primary kv-btn-lg flex-[1.8]"
        >
          <span className="kv-btn-label">{occupe ? "…" : "Ajouter"}</span>
        </button>
      </div>
    </div>
  );
}
