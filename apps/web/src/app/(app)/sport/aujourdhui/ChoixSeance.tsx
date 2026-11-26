"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SEANCES_LIBRES, TypeSeanceLibre, type ModeSport } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { TuileChoix } from "@/components/kv/Choix";
import { EcranPlein } from "@/components/kv/EcranPlein";
import { Segments } from "@/components/Segments";
import { composerSeanceAction, lancerMaSeanceAction } from "../actions";

type Props = {
  aujourdhui: string;
  mode: ModeSport;
  dureeDefaut: number;
  modeles: Array<{ id: string; nom: string; nb: number; duree: number }>;
  /** Séance du programme déjà prévue aujourd'hui : on la rappelle, on ne compose pas par-dessus. */
  auProgramme: { id: string; titre: string } | null;
  /** Proposition à la carte déjà composée aujourd'hui, pas encore commencée. */
  proposition: { id: string; titre: string } | null;
};

const DUREES = [30, 45, 60, 75, 90] as const;
const VUES = [
  { cle: "composer", label: "Composer" },
  { cle: "mes", label: "Mes séances" },
] as const;
type Vue = (typeof VUES)[number]["cle"];

/** Le choix du jour : un type de séance que l'app compose, ou une de ses séances. Une seule vue à la fois. */
export function ChoixSeance({ aujourdhui, mode, dureeDefaut, modeles, auProgramme, proposition }: Props) {
  const router = useRouter();
  const [vue, setVue] = useState<Vue>(mode === "mes_seances" && modeles.length ? "mes" : "composer");
  const [type, setType] = useState<TypeSeanceLibre | null>(null);
  const [duree, setDuree] = useState<number>(() => DUREES.reduce((a, d) => (Math.abs(d - dureeDefaut) < Math.abs(a - dureeDefaut) ? d : a), DUREES[2]));
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, start] = useTransition();

  function composer() {
    if (!type) return;
    setErreur(null);
    start(async () => {
      const r = await composerSeanceAction({ type, duree_min: duree, jour: aujourdhui });
      if (!r.ok) return setErreur(r.erreur);
      router.push(`/sport/seance/${r.valeur.seance_id}?v=0&d=${duree}`);
    });
  }
  function lancer(modeleId: string) {
    setErreur(null);
    start(async () => {
      const r = await lancerMaSeanceAction(modeleId, aujourdhui);
      if (!r.ok) return setErreur(r.erreur);
      if (r.valeur.seance_id) router.push(`/sport/seance/${r.valeur.seance_id}`);
    });
  }

  if (auProgramme)
    return (
      <EcranPlein
        retour="/sport"
        ferme
        surTitre="Aujourd’hui"
        titre={auProgramme.titre}
        sousTitre="Elle est déjà au programme aujourd’hui."
        pied={
          <Link href={`/sport/seance/${auProgramme.id}`} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
            <span className="kv-btn-label">Voir ma séance</span>
            <span className="kv-btn-end">
              <Icon name="arrow_forward" size={22} />
            </span>
          </Link>
        }
      >
        <p className="type-body-md text-fg-secondary">
          Envie d’autre chose ? Reporte-la depuis l’accueil Sport : le programme suit, et tu pourras composer la séance que tu veux.
        </p>
      </EcranPlein>
    );

  return (
    <EcranPlein
      retour="/sport"
      ferme
      surTitre="Aujourd’hui"
      titre="On fait quoi ?"
      sousTitre={vue === "composer" ? "Choisis un type : l’app compose la séance, tu ajustes." : "Lance une de tes séances."}
      pied={
        vue === "composer" ? (
          <button type="button" onClick={composer} disabled={!type || occupe} className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
            <span className="kv-btn-label">{occupe ? "Je compose…" : type ? `Composer mon ${SEANCES_LIBRES[type].titre}` : "Choisis un type"}</span>
            <span className="kv-btn-end">
              <Icon name="arrow_forward" size={22} />
            </span>
          </button>
        ) : undefined
      }
    >
      {erreur && (
        <p role="alert" className="rounded-[var(--radius-input)] bg-feedback-danger-subtle p-[var(--inset-sm)] type-body-sm text-feedback-danger-text">
          {erreur}
        </p>
      )}

      {proposition && (
        <Link
          href={`/sport/seance/${proposition.id}`}
          className="tap flex items-center gap-[var(--inline-md)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-sunken text-fg-brand">
            <Icon name="fitness_center" size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block type-title-sm">{proposition.titre} t’attend</span>
            <span className="block type-body-sm text-fg-secondary">Reprendre la séance déjà composée</span>
          </span>
          <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
        </Link>
      )}

      {modeles.length > 0 && <Segments items={VUES} actif={vue} label="D’où vient la séance" onChoisir={setVue} />}

      {vue === "composer" && (
        <>
          <div className="grid grid-cols-2 gap-[var(--stack-sm)]" role="group" aria-label="Type de séance">
            {TypeSeanceLibre.options.map((t) => (
              <TuileChoix
                key={t}
                titre={<span className="type-title-lg">{SEANCES_LIBRES[t].titre}</span>}
                description={SEANCES_LIBRES[t].aide}
                actif={type === t}
                onClick={() => setType(t)}
                className="min-h-[var(--control-xl)]"
              />
            ))}
          </div>
          <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Durée">
            <h2 className="flex items-baseline justify-between px-[var(--inline-xs)]">
              <span className="type-title-sm">Durée</span>
              <span className="type-body-sm text-fg-secondary">minutes, échauffement compris</span>
            </h2>
            <Segments
              items={DUREES.map((d) => ({ cle: String(d), label: String(d) }))}
              actif={String(duree)}
              label="Durée de la séance en minutes"
              onChoisir={(d) => setDuree(Number(d))}
            />
          </section>
        </>
      )}

      {vue === "mes" && (
        <ul className="flex flex-col gap-[var(--stack-sm)]">
          {modeles.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                disabled={occupe}
                onClick={() => lancer(m.id)}
                className="tap flex w-full items-center gap-[var(--inline-md)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-md)] text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate type-title-md">{m.nom}</span>
                  <span className="block type-body-sm text-fg-secondary">
                    {m.nb} exercice{m.nb > 1 ? "s" : ""} · ≈ {m.duree} min
                  </span>
                </span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action-primary text-fg-on-brand">
                  <Icon name="play_arrow" size={22} filled />
                </span>
              </button>
            </li>
          ))}
          <li>
            <Link href="/sport/ma-seance/nouvelle" className="kv-btn kv-btn-tertiary kv-btn-lg kv-btn-block">
              <Icon name="add" size={20} />
              <span className="kv-btn-label">Créer une séance</span>
            </Link>
          </li>
        </ul>
      )}
    </EcranPlein>
  );
}
