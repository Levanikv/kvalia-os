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
  id: string;
  jour: string;
  type: string;
  etat: string;
  duree_min: number | null;
  kcal: number;
  notes: string | null;
  ressenti: number | null;
  debut_le: string | null;
  faite_le: string | null;
};
type Props = { seance: Seance; exercices: ExoLigne[]; kcalPrevues: number; poids: { valeur: number; source: string } };

// Ressenti 1–5 : des mots, pas d'emoji (règle du design system : jamais d'emoji comme icône).
const RESSENTIS = [
  { v: 1, l: "Épuisé" },
  { v: 2, l: "Dur" },
  { v: 3, l: "Correct" },
  { v: 4, l: "Bien" },
  { v: 5, l: "Au top" },
];

export function Checklist({ seance, exercices, kcalPrevues, poids }: Props) {
  const router = useRouter();
  const [, start] = useTransition();
  const [exos, setExos] = useOptimistic(exercices, (etat, maj: { id: string; fait: boolean }) =>
    etat.map((e) => (e.id === maj.id ? { ...e, fait: maj.fait } : e)),
  );
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
    start(async () => {
      setExos({ id: e.id, fait: !e.fait });
      await cocher(e.id, !e.fait);
    });
  }

  function valider() {
    setEnCours(true);
    start(async () => {
      await terminer(seance.id, ressenti ?? undefined, notes.trim() || undefined);
      setEnCours(false);
      setFin(false);
      router.refresh();
    });
  }

  const seriesTotal = exos.reduce((x, e) => x + e.series, 0);
  const seriesFaites = exos.filter((e) => e.fait).reduce((x, e) => x + e.series, 0);
  const repos = (s: number | null) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : null);

  return (
    <div className="flex flex-col gap-[var(--stack-lg)]">
      {/* Calories et progression */}
      <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
        <div className="flex items-end justify-between gap-[var(--inline-md)]">
          <p className="flex items-baseline gap-[var(--inline-sm)]">
            <span className="type-display-lg">{kcal}</span>
            <span className="kv-mono">kcal {faite ? "brûlées" : "brûlées"}</span>
          </p>
          <p className="kv-mono">≈ {faite ? kcal : kcalPrevues} prévues</p>
        </div>
        <div className="kv-progress-track" aria-hidden>
          <div className={`kv-progress-fill ${faite ? "bg-feedback-success" : "bg-action-primary"}`} style={{ width: `${progression * 100}%` }} />
        </div>
        <p className="flex justify-between kv-mono">
          <span>
            {faits} / {exos.length} exercices
          </span>
          <span>
            {seriesFaites} / {seriesTotal} séries
          </span>
        </p>
        {poids.source === "defaut" && <p className="kv-mono">Estimation sur 80 kg : renseigne ton poids dans les réglages.</p>}
      </section>

      {seance.notes && (
        <p className="rounded-[var(--radius-input)] bg-surface-container-brand-subtle px-[var(--inset-md)] py-[var(--inset-sm)] type-body-sm">{seance.notes}</p>
      )}

      {/* Exercices (design system : Sport/Exercise row) */}
      {exos.length > 0 && (
        <ol className="flex flex-col gap-[var(--stack-sm)]">
          {exos.map((e, i) => (
            <li key={e.id} className={`kv-exo ${e.fait ? "is-done" : ""}`}>
              <Link href={`/sport/exercices/${e.exercice_id}?seance=${seance.id}`} aria-label={`Vidéo : ${e.nom}`} className="kv-exo-thumb overflow-hidden">
                {e.image && <img src={e.image} alt="" className="h-full w-full object-cover" loading="lazy" />}
                <span className="kv-exo-play" aria-hidden>
                  <Icon name="play_arrow" size={16} filled />
                </span>
              </Link>
              <button type="button" onClick={() => setOuvert(e.id)} className="kv-exo-main" aria-label={`Détails : ${e.nom}`}>
                <span className="kv-exo-cap">
                  {String(i + 1).padStart(2, "0")} · {libellePartie(e.partie)}
                  {e.substitut ? " · remplacé" : ""}
                </span>
                <span className="kv-exo-title truncate">{e.nom}</span>
                <span className="kv-exo-meta">
                  {[
                    `${e.series} × ${e.reps_faites ?? e.reps}`,
                    e.charge_kg !== null ? `${e.charge_kg} kg` : e.derniere ? `dernière ${e.derniere.charge_kg} kg` : null,
                    repos(e.repos_s),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>
              <button
                type="button"
                onClick={() => toggle(e)}
                disabled={faite}
                aria-pressed={e.fait}
                aria-label={`${e.fait ? "Annuler" : "Terminer"} : ${e.nom}`}
                className={`kv-row-check ${e.fait ? "is-on" : ""}`}
              >
                <Icon name="check" size={20} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {exos.length > 0 && !faite && <p className="kv-mono">Le nom ouvre la charge et le remplacement, la vignette la vidéo, le rond valide.</p>}

      {/* Résumé si faite (maquette « Fin de séance ») */}
      {faite && (
        <section className="flex flex-col gap-[var(--stack-md)]">
          <span className="kv-tag kv-tag-success self-start">
            Séance terminée
            {seance.faite_le ? ` · ${new Date(seance.faite_le).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : ""}
          </span>
          <div className="grid grid-cols-2 gap-[var(--inline-md)]">
            {[
              ["Calories", String(seance.kcal), "kcal"],
              ["Durée", String(seance.duree_min ?? "—"), "min"],
              ["Séries", String(seriesTotal), ""],
              ["Ressenti", RESSENTIS.find((r) => r.v === seance.ressenti)?.l ?? "—", ""],
            ].map(([k, v, u]) => (
              <div key={k} className="kv-stat">
                <span className="kv-overline">{k}</span>
                <span className="kv-stat-row">
                  <span className="kv-stat-value">{v}</span>
                  {u && <span className="kv-mono">{u}</span>}
                </span>
              </div>
            ))}
          </div>
          <Link
            href={`/nutrition?jour=${seance.jour}`}
            className="tap flex items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-tile)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] type-body-sm"
          >
            <span>Cible nutrition du jour ajustée de +{seance.kcal} kcal</span>
            <Icon name="chevron_right" size={18} className="text-icon-tertiary" />
          </Link>
        </section>
      )}

      {/* Feuille exercice (charge, reps, remplacer) */}
      <FeuilleExercice
        exo={exoOuvert}
        seanceId={seance.id}
        seanceFaite={faite}
        onFermer={() => setOuvert(null)}
        onFait={(id) => {
          const e = exos.find((x) => x.id === id);
          if (e && !e.fait) toggle(e);
        }}
      />

      {/* Barre d'action */}
      {!faite && (
        <div className="fixed inset-x-0 bottom-0 z-20 px-[var(--page-gutter)] pb-[calc(var(--stack-lg)+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-lg">
            <button type="button" onClick={() => setFin(true)} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
              <Icon name={faits === 0 && seance.etat === "prevue" ? "play_arrow" : "flag"} size={22} filled />
              <span className="kv-btn-label">
                {exos.length > 0 && faits < exos.length ? `Terminer la séance · ${faits}/${exos.length}` : "Terminer la séance"}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Feuille Terminer */}
      <BottomSheet ouvert={fin} onFermer={() => setFin(false)} titre="Comment c’était ?" module="sport">
        <div className="grid grid-cols-5 gap-[var(--inline-xs)]" role="radiogroup" aria-label="Ressenti">
          {RESSENTIS.map((r) => (
            <button
              key={r.v}
              type="button"
              role="radio"
              aria-checked={ressenti === r.v}
              onClick={() => setRessenti(r.v)}
              className={`flex flex-col items-center gap-[var(--stack-2xs)] rounded-[var(--radius-input)] py-[var(--control-inset-sm)] ${ressenti === r.v ? "bg-surface-container-inverse text-fg-inverse" : "border border-line-default text-fg-secondary"}`}
            >
              <span className="type-numeric-md">{r.v}</span>
              <span className="kv-mono text-inherit">{r.l}</span>
            </button>
          ))}
        </div>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Une note ? (charge, douleur, PR…)"
          className="mt-[var(--stack-lg)] h-[var(--control-lg)] w-full rounded-[var(--radius-input)] border border-line-default bg-surface-container-default px-[var(--inset-md)] type-body-md outline-none focus:border-focus-ring"
        />
        <div className="mt-[var(--stack-md)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-md)] py-[var(--inset-sm)] type-body-sm text-fg-secondary">
          <p>
            <strong className="text-fg-primary">{kcalFaites > 0 ? kcalFaites : kcalPrevues} kcal</strong> seront ajoutées à ta cible nutrition du jour.
          </p>
          {exos.length > 0 && faits < exos.length && <p className="mt-1">Les {exos.length - faits} exercices restants seront comptés comme faits.</p>}
        </div>
        <div className="mt-[var(--stack-lg)] flex gap-[var(--inline-md)]">
          <button type="button" onClick={() => setFin(false)} className="kv-btn kv-btn-outline kv-btn-lg flex-1">
            Annuler
          </button>
          <button type="button" onClick={valider} disabled={enCours} className="kv-btn kv-btn-primary kv-btn-lg flex-1">
            {enCours ? "…" : "Enregistrer"}
          </button>
        </div>
      </BottomSheet>
      <div className="h-[var(--page-scroll-bottom)]" />
    </div>
  );
}
