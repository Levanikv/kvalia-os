"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { Icon } from "@/components/Icon";
import { cocher, terminer } from "../../actions";
import { libellePartie } from "../../lib";
import { FeuilleExercice, type ExoLigne } from "./FeuilleExercice";

type Seance = {
  id: string; jour: string; type: string; etat: string; duree_min: number | null; kcal: number; notes: string | null;
  ressenti: number | null; debut_le: string | null; faite_le: string | null;
};
type Props = { seance: Seance; exercices: ExoLigne[]; kcalPrevues: number; poids: { valeur: number; source: string } };

const RESSENTIS = [
  { v: 1, e: "😮‍💨", l: "Épuisé" }, { v: 2, e: "😓", l: "Dur" }, { v: 3, e: "🙂", l: "Correct" }, { v: 4, e: "💪", l: "Bien" }, { v: 5, e: "🔥", l: "Au top" },
];

export function Checklist({ seance, exercices, kcalPrevues, poids }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [exos, setExos] = useOptimistic(exercices, (etat, maj: { id: string; fait: boolean }) => etat.map((e) => (e.id === maj.id ? { ...e, fait: maj.fait } : e)));
  const [fin, setFin] = useState(false);
  const [ressenti, setRessenti] = useState<number | null>(seance.ressenti);
  const [notes, setNotes] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [ouvert, setOuvert] = useState<string | null>(null);

  const faite = seance.etat === "faite";
  const faits = exos.filter((e) => e.fait).length;
  const kcalFaites = exos.filter((e) => e.fait).reduce((a, e) => a + e.kcal, 0);
  const kcal = faite ? seance.kcal : kcalFaites;
  const progression = exos.length ? faits / exos.length : faite ? 1 : 0;
  const exoOuvert = exos.find((e) => e.id === ouvert) ?? null;

  function toggle(e: ExoLigne) {
    if (faite) return;
    start(async () => { setExos({ id: e.id, fait: !e.fait }); await cocher(e.id, !e.fait); });
  }

  function valider() {
    setEnCours(true);
    start(async () => {
      await terminer(seance.id, ressenti ?? undefined, notes.trim() || undefined);
      setEnCours(false); setFin(false);
      router.refresh();
    });
  }

  return (
    <div className="pt-2">
      {/* Bandeau kcal / progression */}
      <div className="rounded-lg border border-border bg-surface-2 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-text-3">{faite ? "Brûlées" : "Brûlées jusqu’ici"}</p>
            <p className="text-3xl font-semibold tracking-tight">{kcal}<span className="text-base font-normal text-text-2"> / {faite ? kcal : kcalPrevues} kcal</span></p>
          </div>
          <div className="text-right text-xs text-text-2">
            <p>{seance.duree_min ?? "—"} min</p>
            {exos.length > 0 && <p>{faits}/{exos.length} exercices</p>}
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className={`h-full transition-all ${faite ? "bg-success" : "bg-accent"}`} style={{ width: `${progression * 100}%` }} />
        </div>
        <p className="mt-2 text-[11px] text-text-3">Estimation MET × {poids.valeur} kg{poids.source === "defaut" ? " (poids par défaut — renseigne-le dans les réglages)" : ""}.</p>
      </div>

      {seance.notes && <p className="mt-4 rounded-lg bg-accent-soft px-4 py-3 text-sm">{seance.notes}</p>}

      {/* Exercices */}
      {exos.length > 0 && (
        <ol className="mt-4 overflow-hidden rounded-lg border border-border bg-surface-2">
          {exos.map((e, i) => (
            <li key={e.id} className="flex items-stretch border-b border-border last:border-b-0">
              <Link href={`/sport/exercices/${e.exercice_id}?seance=${seance.id}`} aria-label={`Vidéo : ${e.nom}`} className="flex shrink-0 items-center py-2.5 pl-3 active:opacity-80">
                <div className="relative h-14 w-14 overflow-hidden rounded-md bg-surface-3">
                  {e.image && <img src={e.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white"><Icon name="play_arrow" size={22} filled /></span>
                </div>
              </Link>
              <button type="button" onClick={() => setOuvert(e.id)} className="flex min-w-0 flex-1 flex-col justify-center px-3 py-2.5 text-left active:opacity-80">
                <p className={`truncate font-medium ${e.fait ? "text-text-3 line-through" : ""}`}>{i + 1}. {e.nom}</p>
                <p className="text-xs text-text-2">
                  {e.series} × {e.reps_faites ?? e.reps}
                  {e.charge_kg !== null ? <span className="ml-1.5 rounded-full bg-accent/20 px-1.5 py-px text-[11px] font-semibold text-accent">{e.charge_kg} kg</span>
                    : e.derniere ? <span className="ml-1.5 text-text-3">· dernière fois {e.derniere.charge_kg} kg</span> : null}
                </p>
                <p className="text-[11px] text-text-3">{libellePartie(e.partie)} · {e.kcal} kcal{e.substitut ? " · remplacé" : ""}{e.repos_s ? ` · repos ${e.repos_s} s` : ""}</p>
              </button>
              <button type="button" onClick={() => toggle(e)} disabled={faite} aria-label={e.fait ? "Décocher" : "Fait"}
                className="tap flex w-16 shrink-0 items-center justify-center active:opacity-70 disabled:opacity-60">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${e.fait ? "border-success bg-success text-white" : "border-border"}`}>
                  {e.fait && <Icon name="check" size={20} />}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {exos.length > 0 && <p className="mt-2 px-1 text-[11px] text-text-3">Tape le nom pour noter la charge ou remplacer l’exercice, la vignette pour la vidéo, le rond pour valider.</p>}

      {/* Résumé si faite */}
      {faite && (
        <div className="mt-4 rounded-lg border border-success/40 bg-success/10 p-4">
          <p className="flex items-center gap-2 font-semibold"><Icon name="task_alt" size={22} className="text-success" filled /> Séance terminée</p>
          <p className="mt-1 text-sm text-text-2">
            {seance.kcal} kcal · {seance.duree_min} min{seance.ressenti ? ` · ressenti ${RESSENTIS.find((r) => r.v === seance.ressenti)?.e ?? seance.ressenti}` : ""}
            {seance.faite_le ? ` · ${new Date(seance.faite_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </p>
          <Link href={`/nutrition?jour=${seance.jour}`} className="mt-3 flex items-center justify-between rounded-md bg-surface-2 px-3 py-2.5 text-sm">
            <span>Cible nutrition du jour ajustée de +{seance.kcal} kcal</span><Icon name="chevron_right" size={18} className="text-text-3" />
          </Link>
        </div>
      )}

      {/* Feuille exercice (charge, reps, remplacer) */}
      <FeuilleExercice exo={exoOuvert} seanceId={seance.id} seanceFaite={faite} onFermer={() => setOuvert(null)}
        onFait={(id) => { const e = exos.find((x) => x.id === id); if (e && !e.fait) toggle(e); }} />

      {/* Barre d'action */}
      {!faite && (
        <div className="fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-20 px-4 pb-3">
          <div className="mx-auto max-w-lg">
            <button type="button" onClick={() => setFin(true)} className="tap flex w-full items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white shadow-lg">
              <Icon name="flag" size={22} filled /> {exos.length > 0 && faits < exos.length ? `Terminer (${faits}/${exos.length})` : "Terminer la séance"}
            </button>
          </div>
        </div>
      )}

      {/* Feuille Terminer */}
      <BottomSheet ouvert={fin} onFermer={() => setFin(false)} titre="Comment c’était ?" module="sport">
        <div className="flex justify-between">
          {RESSENTIS.map((r) => (
            <button key={r.v} type="button" onClick={() => setRessenti(r.v)}
              className={`flex w-14 flex-col items-center gap-1 rounded-lg py-2 text-2xl ${ressenti === r.v ? "bg-accent/20 ring-2 ring-accent" : "bg-surface-2"}`}>
              <span>{r.e}</span><span className="text-[10px] text-text-2">{r.l}</span>
            </button>
          ))}
        </div>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Une note ? (charge, douleur, PR…)"
          className="mt-4 w-full rounded-md border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:border-accent" />
        <div className="mt-4 rounded-md bg-surface-2 px-3 py-2.5 text-sm text-text-2">
          <p><strong className="text-text">{kcalFaites > 0 ? kcalFaites : kcalPrevues} kcal</strong> seront ajoutées à ta cible nutrition du jour.</p>
          {exos.length > 0 && faits < exos.length && <p className="mt-1">Les {exos.length - faits} exercices restants seront comptés comme faits.</p>}
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setFin(false)} className="tap flex-1 rounded-full bg-surface-2 font-medium">Annuler</button>
          <button type="button" onClick={valider} disabled={enCours} className="tap flex-1 rounded-full bg-accent font-semibold text-white disabled:opacity-60">
            {enCours ? "…" : "Terminer la séance"}
          </button>
        </div>
      </BottomSheet>
      <div className="h-20" />
    </div>
  );
}
