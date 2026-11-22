"use client";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { dureeModele } from "@kvalia/core";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { Toast } from "@/components/Toast";
import { ChoixDate } from "@/components/kv/ChoixDate";
import { EcranPlein } from "@/components/kv/EcranPlein";
import { creerSeancePersoAction, modifierSeancePersoAction, planifierSeancePersoAction, supprimerSeancePersoAction } from "../actions";
import { formatChrono } from "../lib";

type Ref = { id: string; nom: string; partie: string; partieCle: string; equipement: string | null; image: string | null };
type Exo = { exercice_id: string; series: number; reps: string; repos_s: number; charge_kg: number | null };
type Props = {
  refs: Ref[];
  dates: { aujourdhui: string; lundi: string };
  programmeActif: boolean;
  modele?: { id: string; nom: string; type: string; notes: string | null; exercices: Exo[] };
  joursPlanifies?: number[];
};

const TYPES: Array<[string, string]> = [
  ["full", "Full body"],
  ["upper", "Haut du corps"],
  ["lower", "Bas du corps"],
  ["push", "Push"],
  ["pull", "Pull"],
  ["legs", "Jambes"],
  ["hiit", "HIIT"],
  ["cardio", "Cardio"],
  ["maison", "Maison"],
];
const JOURS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];
const NOMS_JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Éditeur d'une séance perso : nom, type, exercices (du référentiel) avec séries, reps, repos et charge, ordre.
 * Une séance enregistrée se met au programme (chaque semaine un jour, ou une fois à une date) ou se supprime.
 */
export function EditeurSeance({ refs, dates, programmeActif, modele, joursPlanifies = [] }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [nom, setNom] = useState(modele?.nom ?? "");
  const [type, setType] = useState(modele?.type ?? "full");
  const [exos, setExos] = useState<Exo[]>(
    modele?.exercices.map(({ exercice_id, series, reps, repos_s, charge_kg }) => ({ exercice_id, series, reps, repos_s, charge_kg })) ?? [],
  );
  const [catalogue, setCatalogue] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [partie, setPartie] = useState<string | null>(null);
  const [planifier, setPlanifier] = useState(false);
  const [mode, setMode] = useState<"semaine" | "date">(programmeActif ? "semaine" : "date");
  const [jour, setJour] = useState<number>(joursPlanifies[0] ?? 4);
  const [depuis, setDepuis] = useState(dates.aujourdhui);
  const [laDate, setLaDate] = useState(dates.aujourdhui);
  const [supprimer, setSupprimer] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const fermerToast = useCallback(() => setToast(null), []);

  const parId = useMemo(() => new Map(refs.map((r) => [r.id, r])), [refs]);
  const parties = useMemo(() => [...new Map(refs.filter((r) => r.partieCle).map((r) => [r.partieCle, r.partie])).entries()], [refs]);
  const resultats = useMemo(() => {
    const q = recherche
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "");
    return refs
      .filter(
        (r) =>
          (!partie || r.partieCle === partie) &&
          (!q ||
            r.nom
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{Diacritic}/gu, "")
              .includes(q)),
      )
      .slice(0, 60);
  }, [refs, recherche, partie]);
  const duree = exos.length ? dureeModele(exos) : 0;
  const valide = nom.trim().length > 0 && exos.length > 0;

  function maj(i: number, p: Partial<Exo>) {
    setExos((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)));
  }
  function deplacer(i: number, d: -1 | 1) {
    setExos((xs) => {
      const j = i + d;
      if (j < 0 || j >= xs.length) return xs;
      const c = [...xs];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });
  }

  function enregistrer() {
    setOccupe(true);
    setErreur(null);
    const entree = { nom: nom.trim(), type, exercices: exos };
    start(async () => {
      try {
        if (modele) {
          const r = await modifierSeancePersoAction(modele.id, entree);
          setToast(r.seances_mises_a_jour ? `Enregistrée · ${r.seances_mises_a_jour} séances à venir mises à jour` : "Séance enregistrée");
          router.refresh();
        } else {
          const r = await creerSeancePersoAction(entree);
          router.replace(`/sport/ma-seance/${r.id}?cree=1`);
        }
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Enregistrement impossible.");
      }
      setOccupe(false);
    });
  }

  function mettreAuProgramme() {
    if (!modele) return;
    setOccupe(true);
    setErreur(null);
    start(async () => {
      try {
        const r = await planifierSeancePersoAction(
          mode === "semaine" ? { modele_id: modele.id, jour_semaine: jour, a_partir_de: depuis } : { modele_id: modele.id, date: laDate },
        );
        setPlanifier(false);
        setToast(
          r.mode === "chaque_semaine"
            ? `Chaque ${NOMS_JOURS[jour]} · ${r.nb_seances ?? 0} séances reposées`
            : `Ajoutée le ${new Date(laDate + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`,
        );
        router.refresh();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "Impossible de l’ajouter au programme.");
      }
      setOccupe(false);
    });
  }

  function confirmerSuppression() {
    if (!modele) return;
    setOccupe(true);
    start(async () => {
      await supprimerSeancePersoAction(modele.id);
      router.push("/sport/programme");
      router.refresh();
    });
  }

  return (
    <EcranPlein
      retour="/sport/programme"
      ferme={!modele}
      surTitre={modele ? "Ma séance" : "Nouvelle séance"}
      titre={nom.trim() || (modele ? modele.nom : "Ma séance")}
      sousTitre={
        exos.length
          ? `${exos.length} exercice${exos.length > 1 ? "s" : ""} · ≈ ${duree} min${joursPlanifies.length ? ` · chaque ${joursPlanifies.map((j) => NOMS_JOURS[j]).join(", ")}` : ""}`
          : "Ajoute tes exercices, dans l’ordre."
      }
      action={
        modele ? (
          <button type="button" onClick={() => setSupprimer(true)} className="kv-iconbtn kv-iconbtn-glass" aria-label="Supprimer la séance">
            <Icon name="delete" size={22} />
          </button>
        ) : undefined
      }
      pied={
        <div className="flex gap-[var(--inline-md)]">
          {modele && (
            <button type="button" onClick={() => setPlanifier(true)} className="kv-btn kv-btn-secondary kv-btn-xl flex-1">
              <span className="kv-btn-label">Au programme</span>
            </button>
          )}
          <button type="button" onClick={enregistrer} disabled={!valide || occupe} className="kv-btn kv-btn-primary kv-btn-xl flex-1">
            <span className="kv-btn-label">{occupe ? "…" : modele ? "Enregistrer" : "Créer la séance"}</span>
          </button>
        </div>
      }
    >
      {erreur && <p className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">{erreur}</p>}

      <label className="flex flex-col gap-[var(--stack-xs)]">
        <span className="px-[var(--inline-xs)] type-title-sm">Nom</span>
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          maxLength={60}
          placeholder="Ex. Bras du jeudi"
          className="h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
        />
      </label>

      <section className="flex flex-col gap-[var(--stack-xs)]">
        <span className="px-[var(--inline-xs)] type-title-sm">Type</span>
        <div className="flex flex-wrap gap-[var(--inline-sm)]">
          {TYPES.map(([v, l]) => (
            <button key={v} type="button" aria-pressed={type === v} onClick={() => setType(v)} className={`kv-chip ${type === v ? "is-on" : ""}`}>
              {l}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-[var(--stack-sm)]">
        <div className="flex items-baseline justify-between px-[var(--inline-xs)]">
          <h2 className="type-title-lg">Exercices</h2>
          {exos.length > 0 && <span className="kv-mono">≈ {duree} min</span>}
        </div>
        {exos.length === 0 && (
          <p className="rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)] text-center type-body-sm text-fg-secondary">
            Pas encore d’exercice. Ajoute-les depuis la bibliothèque (317 mouvements en vidéo).
          </p>
        )}
        <ol className="flex flex-col gap-[var(--stack-sm)]">
          {exos.map((e, i) => {
            const r = parId.get(e.exercice_id);
            return (
              <li
                key={`${e.exercice_id}-${i}`}
                className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default p-[var(--inset-sm)] shadow-card"
              >
                <div className="flex items-center gap-[var(--inline-md)]">
                  <span className="kv-exo-thumb !h-12 !w-12" style={r?.image ? { backgroundImage: `url(${r.image})` } : undefined} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="kv-exo-cap">
                      {String(i + 1).padStart(2, "0")} · {r?.partie}
                    </span>
                    <span className="block truncate kv-exo-title">{r?.nom ?? e.exercice_id}</span>
                  </span>
                  <button type="button" onClick={() => deplacer(i, -1)} disabled={i === 0} className="kv-iconbtn" aria-label="Monter">
                    <Icon name="arrow_upward" size={18} />
                  </button>
                  <button type="button" onClick={() => deplacer(i, 1)} disabled={i === exos.length - 1} className="kv-iconbtn" aria-label="Descendre">
                    <Icon name="arrow_downward" size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExos((xs) => xs.filter((_, k) => k !== i))}
                    className="kv-iconbtn"
                    aria-label={`Retirer ${r?.nom ?? ""}`}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-[var(--inline-sm)]">
                  <Reglage
                    label="Séries"
                    valeur={String(e.series)}
                    moins={() => maj(i, { series: Math.max(1, e.series - 1) })}
                    plus={() => maj(i, { series: Math.min(10, e.series + 1) })}
                  />
                  <label className="flex flex-col items-center gap-[var(--stack-2xs)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-xs)] py-[var(--inset-xs)]">
                    <span className="kv-overline">Reps</span>
                    <input
                      value={e.reps}
                      onChange={(ev) => maj(i, { reps: ev.target.value.slice(0, 12) })}
                      className="w-full bg-transparent text-center type-title-sm outline-none"
                      aria-label="Répétitions"
                    />
                  </label>
                  <Reglage
                    label="Repos"
                    valeur={formatChrono(e.repos_s)}
                    moins={() => maj(i, { repos_s: Math.max(0, e.repos_s - 15) })}
                    plus={() => maj(i, { repos_s: Math.min(600, e.repos_s + 15) })}
                  />
                  <label className="flex flex-col items-center gap-[var(--stack-2xs)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-xs)] py-[var(--inset-xs)]">
                    <span className="kv-overline">Kg</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.5}
                      value={e.charge_kg ?? ""}
                      placeholder="—"
                      onChange={(ev) => maj(i, { charge_kg: ev.target.value === "" ? null : Number(ev.target.value) })}
                      className="w-full bg-transparent text-center type-title-sm outline-none"
                      aria-label="Charge en kg"
                    />
                  </label>
                </div>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setCatalogue(true)} disabled={exos.length >= 20} className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
          <Icon name="add" size={20} />
          <span className="kv-btn-label">Ajouter un exercice</span>
        </button>
      </section>

      {/* Bibliothèque */}
      <BottomSheet ouvert={catalogue} onFermer={() => setCatalogue(false)} titre="Ajouter un exercice" pleine module="sport">
        <div className="flex flex-col gap-[var(--stack-sm)]">
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Chercher : développé, squat, curl…"
            className="h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
          />
          <div className="bande-jours -mx-5 flex gap-[var(--inline-sm)] overflow-x-auto px-5">
            <button type="button" aria-pressed={!partie} onClick={() => setPartie(null)} className={`kv-chip shrink-0 ${!partie ? "is-on" : ""}`}>
              Tout
            </button>
            {parties.map(([cle, l]) => (
              <button
                key={cle}
                type="button"
                aria-pressed={partie === cle}
                onClick={() => setPartie(cle)}
                className={`kv-chip shrink-0 ${partie === cle ? "is-on" : ""}`}
              >
                {l}
              </button>
            ))}
          </div>
          <ul className="flex flex-col">
            {resultats.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    setExos((xs) => [...xs, { exercice_id: r.id, series: 3, reps: "10", repos_s: 90, charge_kg: null }]);
                    setToast(`${r.nom} ajouté`);
                    setCatalogue(false);
                    setRecherche("");
                  }}
                  className="tap flex w-full items-center gap-[var(--inline-md)] border-b border-line-subtle py-[var(--inset-xs)] text-left"
                >
                  <span className="kv-exo-thumb !h-11 !w-11" style={r.image ? { backgroundImage: `url(${r.image})` } : undefined} aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-label-lg">{r.nom}</span>
                    <span className="block kv-mono">{r.partie}</span>
                  </span>
                  <Icon name="add" size={20} className="text-icon-brand" />
                </button>
              </li>
            ))}
            {resultats.length === 0 && <li className="py-[var(--stack-lg)] text-center type-body-sm text-fg-tertiary">Rien trouvé. Essaie un autre mot.</li>}
          </ul>
        </div>
      </BottomSheet>

      {/* Au programme */}
      <BottomSheet
        ouvert={planifier}
        onFermer={() => setPlanifier(false)}
        titre="Mettre au programme"
        module="sport"
        pied={
          <button type="button" onClick={mettreAuProgramme} disabled={occupe} className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block">
            <span className="kv-btn-label">{occupe ? "…" : "Ajouter"}</span>
          </button>
        }
      >
        <div className="flex flex-col gap-[var(--stack-md)]">
          <div className="kv-seg" role="radiogroup" aria-label="Fréquence">
            <button
              type="button"
              role="radio"
              aria-checked={mode === "semaine"}
              disabled={!programmeActif}
              onClick={() => setMode("semaine")}
              className={`kv-seg-item ${mode === "semaine" ? "is-on" : ""}`}
            >
              Chaque semaine
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "date"}
              onClick={() => setMode("date")}
              className={`kv-seg-item ${mode === "date" ? "is-on" : ""}`}
            >
              Une fois
            </button>
          </div>
          {mode === "semaine" ? (
            <>
              <div className="grid grid-cols-7 gap-[var(--inline-xs)]" role="radiogroup" aria-label="Jour">
                {JOURS.map((j) => (
                  <button
                    key={j.v}
                    type="button"
                    role="radio"
                    aria-checked={jour === j.v}
                    aria-label={NOMS_JOURS[j.v]}
                    onClick={() => setJour(j.v)}
                    className={`flex h-12 items-center justify-center rounded-[var(--radius-input)] border type-label-lg ${jour === j.v ? "border-transparent bg-surface-container-inverse text-fg-inverse" : "border-line-default bg-surface-container-default"}`}
                  >
                    {j.l}
                  </button>
                ))}
              </div>
              <ChoixDate valeur={depuis} onChange={setDepuis} aujourdhui={dates.aujourdhui} titre="Chaque semaine à partir du" />
              <p className="type-body-sm text-fg-secondary">
                Chaque {NOMS_JOURS[jour]}, elle remplace la séance générée (ou s’ajoute si c’était repos). En semaine de décharge, une série de moins.
              </p>
            </>
          ) : (
            <>
              <ChoixDate valeur={laDate} onChange={setLaDate} aujourdhui={dates.aujourdhui} titre="Le jour de la séance" />
              <p className="type-body-sm text-fg-secondary">Elle remplace la séance de salle prévue ce jour-là, s’il y en a une (pas si elle est faite).</p>
            </>
          )}
          {!programmeActif && <p className="type-body-sm text-fg-tertiary">« Chaque semaine » demande un programme actif.</p>}
        </div>
      </BottomSheet>

      {/* Supprimer */}
      <BottomSheet ouvert={supprimer} onFermer={() => setSupprimer(false)} module="sport">
        <h2 className="type-title-lg">Supprimer « {modele?.nom} » ?</h2>
        <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
          {joursPlanifies.length
            ? "Ses jours au programme repassent en séances générées à partir d’aujourd’hui. L’historique reste."
            : "Les séances déjà faites restent dans l’historique."}
        </p>
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setSupprimer(false)} className="kv-btn kv-btn-tertiary kv-btn-lg flex-1">
            Garder
          </button>
          <button type="button" onClick={confirmerSuppression} disabled={occupe} className="kv-btn kv-btn-danger kv-btn-lg flex-1">
            Supprimer
          </button>
        </div>
      </BottomSheet>

      <Toast message={toast} onFermer={fermerToast} />
    </EcranPlein>
  );
}

function Reglage({ label, valeur, moins, plus }: { label: string; valeur: string; moins: () => void; plus: () => void }) {
  return (
    <div className="flex flex-col items-center gap-[var(--stack-2xs)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-xs)] py-[var(--inset-xs)]">
      <span className="kv-overline">{label}</span>
      <div className="flex w-full items-center justify-between">
        <button
          type="button"
          onClick={moins}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-default"
          aria-label={`${label} : moins`}
        >
          <Icon name="remove" size={16} />
        </button>
        <span className="type-title-sm tabular-nums">{valeur}</span>
        <button
          type="button"
          onClick={plus}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container-default"
          aria-label={`${label} : plus`}
        >
          <Icon name="add" size={16} />
        </button>
      </div>
    </div>
  );
}
