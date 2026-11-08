"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { equivalentsAction, noterChargeAction, remplacerAction } from "../../actions";
import { libelleMateriel, libellePartie, nomAffiche } from "../../lib";

export type ExoLigne = {
  id: string;
  exercice_id: string;
  nom: string;
  partie: string | null;
  image: string | null;
  series: number;
  reps: string;
  repos_s: number;
  kcal: number;
  fait: boolean;
  equipement: string | null;
  charge_kg: number | null;
  reps_faites: number | null;
  derniere: { charge_kg: number; jour: string } | null;
  substitut: boolean;
};
type Equivalent = {
  id: string;
  nom: string;
  nom_fr: string | null;
  partie_corps: string | null;
  equipement: string | null;
  compose: boolean;
  raison: string;
  score: number;
};
type Props = { exo: ExoLigne | null; seanceId: string; seanceFaite: boolean; onFermer: () => void; onFait: (id: string) => void };

/** Feuille d'un exercice de la séance : charge (kg), reps réalisées, vidéo, marquer fait, remplacer (équivalents). */
export function FeuilleExercice({ exo, seanceId, seanceFaite, onFermer, onFait }: Props) {
  return (
    <BottomSheet ouvert={!!exo} onFermer={onFermer} module="sport">
      {exo && <Contenu key={exo.id} exo={exo} seanceId={seanceId} seanceFaite={seanceFaite} onFermer={onFermer} onFait={onFait} />}
    </BottomSheet>
  );
}

/** Monté avec `key={exo.id}` : l'état repart de zéro pour chaque exercice ouvert, sans effet. */
function Contenu({ exo, seanceId, seanceFaite, onFermer, onFait }: Omit<Props, "exo"> & { exo: ExoLigne }) {
  const router = useRouter();
  const [, start] = useTransition();
  const [charge, setCharge] = useState<number | null>(exo.charge_kg ?? exo.derniere?.charge_kg ?? null);
  const [reps, setReps] = useState<string>(exo.reps_faites?.toString() ?? "");
  const [sauve, setSauve] = useState(false);
  const [mode, setMode] = useState<"detail" | "remplacer">("detail");
  const [equiv, setEquiv] = useState<Equivalent[] | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [portee, setPortee] = useState<"seance" | "programme">("seance");
  const [occupe, setOccupe] = useState(false);

  const pas = exo.equipement === "dumbbell" ? 1 : 2.5;

  function enregistrer(puisFait = false) {
    setOccupe(true);
    start(async () => {
      await noterChargeAction(exo.id, { charge_kg: charge, reps_faites: reps === "" ? null : Number(reps) });
      setSauve(true);
      setOccupe(false);
      if (puisFait) {
        onFait(exo.id);
        onFermer();
      } else router.refresh();
    });
  }

  function ouvrirRemplacer() {
    setMode("remplacer");
    if (!equiv)
      start(async () => {
        setEquiv(await equivalentsAction(exo.id));
      });
  }

  function confirmerRemplacement() {
    if (!choix) return;
    setOccupe(true);
    start(async () => {
      await remplacerAction(exo.id, choix, portee);
      setOccupe(false);
      onFermer();
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between pb-2">
        <h2 className="text-lg font-semibold tracking-tight">{mode === "detail" ? exo.nom : "Remplacer par…"}</h2>
        <button type="button" onClick={onFermer} aria-label="Fermer" className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-text-2">
          <Icon name="close" size={18} />
        </button>
      </div>
      {mode === "detail" ? (
        <>
          <div className="flex items-center gap-3">
            <Link
              href={`/sport/exercices/${exo.exercice_id}?seance=${seanceId}`}
              className="relative h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-3"
            >
              {exo.image && <img src={exo.image} alt="" className="h-full w-full object-cover" />}
              <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white">
                <Icon name="play_arrow" size={28} filled />
              </span>
            </Link>
            <div className="min-w-0 text-sm">
              <p className="text-2xl font-semibold tracking-tight">
                {exo.series} × {exo.reps}
              </p>
              <p className="text-text-2">
                {libellePartie(exo.partie)}
                {exo.equipement ? ` · ${libelleMateriel(exo.equipement)}` : ""}
              </p>
              <p className="text-xs text-text-3">
                {exo.repos_s ? `Repos ${exo.repos_s} s · ` : ""}
                {exo.kcal} kcal
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-text-3">Charge</p>
                {exo.derniere && (
                  <p className="text-xs text-text-2">
                    Dernière fois : {exo.derniere.charge_kg} kg ·{" "}
                    {new Date(exo.derniere.jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCharge(Math.max(0, (charge ?? 0) - pas));
                    setSauve(false);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-3"
                  aria-label="Moins"
                >
                  <Icon name="remove" size={20} />
                </button>
                <div className="flex w-24 items-baseline justify-center gap-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step={pas}
                    min={0}
                    value={charge ?? ""}
                    placeholder="—"
                    onChange={(e) => {
                      setCharge(e.target.value === "" ? null : Number(e.target.value));
                      setSauve(false);
                    }}
                    className="w-16 bg-transparent text-right text-2xl font-semibold tabular-nums outline-none"
                  />
                  <span className="text-sm text-text-2">kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCharge((charge ?? 0) + pas);
                    setSauve(false);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-3"
                  aria-label="Plus"
                >
                  <Icon name="add" size={20} />
                </button>
              </div>
            </div>
            <label className="mt-3 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm">
                Reps réalisées <span className="text-text-3">(optionnel)</span>
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={200}
                value={reps}
                placeholder={exo.reps}
                onChange={(e) => {
                  setReps(e.target.value);
                  setSauve(false);
                }}
                className="w-20 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => enregistrer(false)}
              disabled={occupe}
              className="tap flex-1 rounded-full bg-surface-2 font-medium disabled:opacity-60"
            >
              {sauve ? "Enregistré ✓" : "Enregistrer"}
            </button>
            {!seanceFaite && !exo.fait && (
              <button
                type="button"
                onClick={() => enregistrer(true)}
                disabled={occupe}
                className="tap flex flex-1 items-center justify-center gap-1.5 rounded-full bg-accent font-semibold text-white disabled:opacity-60"
              >
                <Icon name="check" size={20} /> Fait
              </button>
            )}
          </div>

          {!seanceFaite && (
            <button
              type="button"
              onClick={ouvrirRemplacer}
              className="tap mt-3 flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-4 text-sm"
            >
              <span className="flex items-center gap-2 text-text-2">
                <Icon name="swap_horiz" size={20} /> Remplacer cet exercice
              </span>
              <Icon name="chevron_right" size={18} className="text-text-3" />
            </button>
          )}
          <Link
            href={`/sport/exercices/${exo.exercice_id}?seance=${seanceId}`}
            className="tap mt-2 flex w-full items-center justify-between rounded-lg border border-border bg-surface-2 px-4 text-sm"
          >
            <span className="flex items-center gap-2 text-text-2">
              <Icon name="play_circle" size={20} /> Vidéo, consignes, historique de charge
            </span>
            <Icon name="chevron_right" size={18} className="text-text-3" />
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-text-2">
            Mêmes muscles, matériel disponible. Pour <strong className="text-text">{exo.nom}</strong>.
          </p>
          {!equiv ? (
            <p className="py-8 text-center text-sm text-text-3">Recherche d’équivalents…</p>
          ) : equiv.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-3">Aucun équivalent trouvé avec ton matériel.</p>
          ) : (
            <ul className="mt-3 overflow-hidden rounded-lg border border-border bg-surface-2">
              {equiv.map((q) => (
                <li key={q.id} className="border-b border-border last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setChoix(q.id)}
                    className={`tap flex w-full items-center gap-3 px-3 py-2 text-left ${choix === q.id ? "bg-accent/15" : ""}`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${choix === q.id ? "border-accent bg-accent text-white" : "border-border"}`}
                    >
                      {choix === q.id && <Icon name="check" size={16} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{nomAffiche(q)}</span>
                      <span className="block truncate text-[11px] text-text-3">
                        {libelleMateriel(q.equipement)}
                        {q.raison ? ` · ${q.raison}` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {choix && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs text-text-2">Portée</p>
              <div className="flex rounded-full bg-surface-2 p-1 text-sm font-medium">
                <button
                  type="button"
                  onClick={() => setPortee("seance")}
                  className={`flex-1 rounded-full py-2 ${portee === "seance" ? "bg-surface text-text shadow-sm" : "text-text-2"}`}
                >
                  Cette séance
                </button>
                <button
                  type="button"
                  onClick={() => setPortee("programme")}
                  className={`flex-1 rounded-full py-2 ${portee === "programme" ? "bg-surface text-text shadow-sm" : "text-text-2"}`}
                >
                  Toutes les séances à venir
                </button>
              </div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setMode("detail")} className="tap flex-1 rounded-full bg-surface-2 font-medium">
              Retour
            </button>
            <button
              type="button"
              onClick={confirmerRemplacement}
              disabled={!choix || occupe}
              className="tap flex-1 rounded-full bg-accent font-semibold text-white disabled:opacity-50"
            >
              {occupe ? "…" : "Remplacer"}
            </button>
          </div>
        </>
      )}
    </>
  );
}
