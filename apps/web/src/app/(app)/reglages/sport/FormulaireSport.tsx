"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LIBELLES, type ParametresSport } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { enregistrerParametres, genererProgramme } from "../../sport/actions";

type Props = {
  initial: ParametresSport;
  poids: { valeur: number; source: string };
  programme: { nom: string; debut: string; fin: string | null } | null;
  materiels: Array<[string, number]>;
};

const JOURS = [
  { v: 1, l: "L" },
  { v: 2, l: "M" },
  { v: 3, l: "M" },
  { v: 4, l: "J" },
  { v: 5, l: "V" },
  { v: 6, l: "S" },
  { v: 0, l: "D" },
];
const OBJECTIFS: ParametresSport["objectif"][] = ["hypertrophie", "force", "perte_de_gras", "endurance"];
const NIVEAUX: ParametresSport["niveau"][] = ["beginner", "intermediate", "advanced"];

export function FormulaireSport({ initial, poids, programme, materiels }: Props) {
  const router = useRouter();
  const [p, setP] = useState<ParametresSport>(initial);
  const [, start] = useTransition();
  const [etat, setEtat] = useState<"idle" | "sauvegarde" | "confirme" | "generation" | "ok">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [debut, setDebut] = useState<string>("");

  const salleOk = p.jours_salle.length >= p.rythme.salle;
  const boxeOk = p.jours_boxe.length >= p.rythme.boxe;
  const conflit = p.jours_salle.some((j) => p.jours_boxe.includes(j));

  function maj<K extends keyof ParametresSport>(k: K, v: ParametresSport[K]) {
    setP((x) => ({ ...x, [k]: v }));
    setEtat("idle");
  }
  function toggleJour(liste: "jours_salle" | "jours_boxe", j: number) {
    const cur = p[liste];
    maj(liste, cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j].sort());
  }

  function sauvegarder() {
    setEtat("sauvegarde");
    start(async () => {
      await enregistrerParametres(p);
      setEtat("ok");
      setMessage("Paramètres enregistrés.");
      router.refresh();
    });
  }
  function generer() {
    setEtat("generation");
    start(async () => {
      try {
        const r = await genererProgramme(p, debut || undefined);
        setMessage(
          `Programme généré : ${r.nb_seances} séances, ${r.nb_exercices} exercices, du ${new Date(r.debut + "T12:00:00").toLocaleDateString("fr-FR")} au ${new Date(r.fin + "T12:00:00").toLocaleDateString("fr-FR")}.${r.avertissements.length ? " " + r.avertissements.join(" ") : ""}`,
        );
        setEtat("ok");
        router.push("/sport");
      } catch (e) {
        setMessage(`Échec : ${e instanceof Error ? e.message : String(e)}`);
        setEtat("idle");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pt-2">
      {programme && (
        <div className="rounded-lg bg-accent-soft px-4 py-3 text-sm">
          <p className="font-medium">Programme actif : {programme.nom}</p>
          <p className="text-text-2">
            {new Date(programme.debut + "T12:00:00").toLocaleDateString("fr-FR")} →{" "}
            {programme.fin ? new Date(programme.fin + "T12:00:00").toLocaleDateString("fr-FR") : "…"}
          </p>
        </div>
      )}

      <Section titre="Rythme hebdo" note="Combien de séances, et quels jours.">
        <Compteur label="Salle" valeur={p.rythme.salle} min={0} max={6} onChange={(v) => maj("rythme", { ...p.rythme, salle: v })} />
        <Jours label="Jours de salle" selection={p.jours_salle} onToggle={(j) => toggleJour("jours_salle", j)} />
        <Compteur label="Boxe" valeur={p.rythme.boxe} min={0} max={3} onChange={(v) => maj("rythme", { ...p.rythme, boxe: v })} />
        <Jours label="Jours de boxe" selection={p.jours_boxe} onToggle={(j) => toggleJour("jours_boxe", j)} />
        {(!salleOk || !boxeOk || conflit) && (
          <p className="text-xs text-danger">
            {!salleOk && `Coche au moins ${p.rythme.salle} jour(s) de salle. `}
            {!boxeOk && `Coche au moins ${p.rythme.boxe} jour(s) de boxe. `}
            {conflit && "Un même jour est coché salle et boxe : la salle l’emporte."}
          </p>
        )}
      </Section>

      <Section titre="Séance" note="Durée cible et objectif ; le générateur adapte séries, reps et repos.">
        <Compteur label="Durée (min)" valeur={p.duree_min} min={20} max={150} pas={5} onChange={(v) => maj("duree_min", v)} />
        <Choix
          label="Objectif"
          options={OBJECTIFS.map((o) => [o, LIBELLES.objectif[o]])}
          valeur={p.objectif}
          onChange={(v) => maj("objectif", v as ParametresSport["objectif"])}
        />
        <Choix
          label="Niveau"
          options={NIVEAUX.map((n) => [n, LIBELLES.niveau[n]])}
          valeur={p.niveau}
          onChange={(v) => maj("niveau", v as ParametresSport["niveau"])}
        />
        <Compteur label="Semaines" valeur={p.semaines} min={4} max={24} pas={4} onChange={(v) => maj("semaines", v)} />
      </Section>

      <Section titre="Matériel disponible" note="Seuls les exercices faisables avec ce matériel sont proposés.">
        <div className="flex flex-wrap gap-1.5">
          {materiels.map(([m, n]) => {
            const actif = p.materiel.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => maj("materiel", actif ? p.materiel.filter((x) => x !== m) : [...p.materiel, m])}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${actif ? "bg-accent text-white" : "bg-surface-3 text-text-2"}`}
              >
                {LIBELLES.materiel[m] ?? m} <span className={actif ? "text-white/70" : "text-text-3"}>{n}</span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section titre="Calories" note="kcal = MET de l’exercice × poids × durée. Le poids vient de ta dernière pesée, sinon de la valeur ci-dessous.">
        <div className="flex items-center justify-between">
          <span className="text-sm">Poids utilisé</span>
          <span className="text-sm text-text-2">
            {poids.valeur} kg{" "}
            <span className="text-text-3">({poids.source === "pesee" ? "dernière pesée" : poids.source === "reglages" ? "réglage" : "défaut"})</span>
          </span>
        </div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Poids de secours (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min={30}
            max={250}
            value={p.poids_kg ?? ""}
            placeholder="80"
            onChange={(e) => maj("poids_kg", e.target.value ? Number(e.target.value) : undefined)}
            className="w-24 rounded-md border border-border bg-surface px-3 py-2 text-right text-sm outline-none focus:border-accent"
          />
        </label>
      </Section>

      <Section titre="Génération" note="Le programme actif est remplacé : ses séances futures non faites sont supprimées, l’historique est conservé.">
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm">Premier jour</span>
          <input
            type="date"
            value={debut}
            onChange={(e) => setDebut(e.target.value)}
            className="rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <p className="text-xs text-text-3">Vide = lundi prochain.</p>
      </Section>

      {message && (
        <p className={`rounded-md px-4 py-3 text-sm ${message.startsWith("Échec") ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}>{message}</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={sauvegarder}
          disabled={etat === "sauvegarde" || etat === "generation"}
          className="tap rounded-full border border-border bg-surface-2 font-medium disabled:opacity-60"
        >
          {etat === "sauvegarde" ? "Enregistrement…" : "Enregistrer les paramètres"}
        </button>
        {etat !== "confirme" ? (
          <button
            type="button"
            onClick={() => setEtat("confirme")}
            disabled={etat === "generation" || !salleOk}
            className="tap flex items-center justify-center gap-2 rounded-full bg-accent font-semibold text-white disabled:opacity-60"
          >
            <Icon name="auto_awesome" size={20} /> {programme ? "Régénérer le programme" : `Générer le programme (${p.semaines} semaines)`}
          </button>
        ) : (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-4">
            <p className="text-sm font-medium">{programme ? "Remplacer le programme actif ?" : "Générer le programme ?"}</p>
            <p className="mt-1 text-xs text-text-2">
              {p.rythme.salle} salle + {p.rythme.boxe} boxe par semaine · {p.semaines} semaines · {p.duree_min} min · {LIBELLES.objectif[p.objectif]}.
            </p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => setEtat("idle")} className="tap flex-1 rounded-full bg-surface-3 text-sm font-medium">
                Annuler
              </button>
              <button type="button" onClick={generer} className="tap flex-1 rounded-full bg-accent text-sm font-semibold text-white">
                Confirmer
              </button>
            </div>
          </div>
        )}
        {etat === "generation" && <p className="text-center text-xs text-text-2">Génération en cours…</p>}
      </div>
    </div>
  );
}

function Section({ titre, note, children }: { titre: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4">
      <h2 className="text-sm font-semibold">{titre}</h2>
      {note && <p className="mt-0.5 text-xs text-text-3">{note}</p>}
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

function Compteur({
  label,
  valeur,
  min,
  max,
  pas = 1,
  onChange,
}: {
  label: string;
  valeur: number;
  min: number;
  max: number;
  pas?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, valeur - pas))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3"
          aria-label="Moins"
        >
          <Icon name="remove" size={18} />
        </button>
        <span className="w-10 text-center text-base font-semibold tabular-nums">{valeur}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, valeur + pas))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-3"
          aria-label="Plus"
        >
          <Icon name="add" size={18} />
        </button>
      </div>
    </div>
  );
}

function Jours({ label, selection, onToggle }: { label: string; selection: number[]; onToggle: (j: number) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-text-2">{label}</p>
      <div className="flex justify-between">
        {JOURS.map((j, i) => {
          const actif = selection.includes(j.v);
          return (
            <button
              key={i}
              type="button"
              onClick={() => onToggle(j.v)}
              aria-pressed={actif}
              className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${actif ? "bg-accent text-white" : "bg-surface-3 text-text-2"}`}
            >
              {j.l}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Choix({ label, options, valeur, onChange }: { label: string; options: Array<[string, string]>; valeur: string; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs text-text-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            aria-pressed={valeur === v}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${valeur === v ? "bg-accent text-white" : "bg-surface-3 text-text-2"}`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
