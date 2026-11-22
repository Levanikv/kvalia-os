import Link from "next/link";
import { journalDuJour, repasDuMoment, suggererRepas, type AlimentSortie } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { EntreeCarte } from "../sport/EntreeCarte";
import { enteteJour } from "../sport/entete";
import { jourDepuis } from "../sport/lib";
import { BoutonAjout, FournisseurAjout } from "./Ajout";
import { RepasDuJour } from "./RepasDuJour";
import { Suggestions } from "./Suggestions";

type Props = { searchParams: Promise<{ jour?: string }> };

const nf = (n: number) => n.toLocaleString("fr-FR");

/**
 * Nutrition — journal du jour (même en-tête que Sport : pastille du jour, semaine, bande de jours) :
 * anneau des calories restantes (cible = base + sport du jour), barres de macros, « À manger maintenant »
 * (suggestions selon le reste, le repas du moment et la séance), repas de la journée, puis les entrées secondaires.
 * « Ajouter un aliment » est en barre d'action fixe.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const moment = repasDuMoment();
  const [j, entete, suggestion, { data: recentsBruts }] = await Promise.all([
    journalDuJour(supabase, user.id, jour),
    enteteJour(supabase, jour, auj, "/nutrition"),
    suggererRepas(supabase, user.id, { jour, repas: moment }),
    supabase.from("journal_repas").select("aliment_id, created_at").not("aliment_id", "is", null).order("created_at", { ascending: false }).limit(40),
  ]);
  // Aliments récents : les derniers utilisés, sans doublon, pour un ajout en deux gestes.
  const idsRecents = [...new Set((recentsBruts ?? []).map((r) => r.aliment_id as string))].slice(0, 8);
  const { data: alimentsRecents } = idsRecents.length
    ? await supabase.from("aliments").select("id, nom, marque, source, kcal, prot, gluc, lip, fibres, portion_g, portion_nom, nutriscore").in("id", idsRecents)
    : { data: [] };
  const recents = idsRecents
    .map((id) => (alimentsRecents ?? []).find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ ...a, kcal: Number(a.kcal), prot: Number(a.prot), gluc: Number(a.gluc), lip: Number(a.lip) })) as AlimentSortie[];

  const modifiable = jour <= auj;
  const pct = j.cible > 0 ? Math.min(1, Math.max(0, j.consomme / j.cible)) : 0;
  const depasse = j.reste < 0;
  const titreDate = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const macros = [
    { nom: "Protéines", valeur: j.proteines, cible: j.macros_cible.prot, ton: "kv-tone-protein" },
    { nom: "Glucides", valeur: j.glucides, cible: j.macros_cible.gluc, ton: "kv-tone-carbs" },
    { nom: "Lipides", valeur: j.lipides, cible: j.macros_cible.lip, ton: "kv-tone-fat" },
  ];
  const R = 52;
  const tour = 2 * Math.PI * R;

  return (
    <FournisseurAjout jour={jour} repasDuMoment={moment} recents={recents}>
      <ModuleFrame
        module="nutrition"
        surTitre="Nutrition"
        titre={titreDate.charAt(0).toUpperCase() + titreDate.slice(1)}
        action={entete.action}
        barre={entete.barre}
        pied={modifiable ? <BoutonAjout /> : undefined}
      >
        <RealtimeRefresh tables={["seances", "journal_repas"]} />
        <div className="cascade flex flex-col gap-[var(--stack-lg)]">
          {/* Bilan : calories restantes et macros */}
          <section className="flex flex-col gap-[var(--stack-md)] rounded-[var(--radius-card-hero)] border border-line-subtle bg-surface-container-default p-[var(--inset-lg)] shadow-card">
            <div className="flex items-center gap-[var(--inline-xl)]">
              <div className="kv-ring h-32 w-32">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${j.reste} kcal restantes sur ${j.cible}`}>
                  <circle cx="60" cy="60" r={R} fill="none" strokeWidth="10" className="kv-ring-track" />
                  <circle
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className={`kv-ring-fill ${depasse ? "stroke-feedback-danger" : "kv-stroke-brand"}`}
                    strokeDasharray={`${(pct * tour).toFixed(1)} ${tour.toFixed(1)}`}
                  />
                </svg>
                <div className="kv-ring-center items-center justify-center">
                  <span className="type-display-md tabular-nums">{nf(Math.abs(j.reste))}</span>
                  <span className="kv-overline">{depasse ? "kcal en trop" : "kcal restantes"}</span>
                </div>
              </div>
              <dl className="flex min-w-0 flex-1 flex-col gap-[var(--stack-xs)]">
                <div className="flex items-baseline justify-between gap-[var(--inline-md)]">
                  <dt className="type-body-sm text-fg-secondary">Mangées</dt>
                  <dd className="type-label-lg tabular-nums">{nf(j.consomme)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-[var(--inline-md)]">
                  <dt className="type-body-sm text-fg-secondary">Base</dt>
                  <dd className="type-label-lg tabular-nums">{nf(j.base)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-[var(--inline-md)]">
                  <dt className="flex items-center gap-[var(--inline-xs)] type-body-sm text-fg-secondary">
                    <Icon name="local_fire_department" size={16} /> Sport
                  </dt>
                  <dd className={`type-label-lg tabular-nums ${j.brule > 0 ? "text-feedback-success-text" : "text-fg-tertiary"}`}>+{nf(j.brule)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-[var(--inline-md)] border-t border-line-subtle pt-[var(--stack-xs)]">
                  <dt className="type-label-md">Cible du jour</dt>
                  <dd className="type-title-sm tabular-nums">{nf(j.cible)}</dd>
                </div>
              </dl>
            </div>
            <div className="grid grid-cols-3 gap-[var(--inline-md)]">
              {macros.map((m) => (
                <div key={m.nom} className="kv-progress">
                  <div className="kv-progress-head">
                    <span className="kv-overline">{m.nom}</span>
                  </div>
                  <div className="kv-progress-track" aria-hidden>
                    <div className={`kv-progress-fill ${m.ton}`} style={{ width: `${Math.min(100, (m.valeur / Math.max(1, m.cible)) * 100)}%` }} />
                  </div>
                  <span className="kv-mono">
                    <span className="text-fg-primary">{nf(m.valeur)}</span> / {nf(m.cible)} g
                  </span>
                </div>
              ))}
            </div>
            {j.seances.length > 0 && (
              <ul className="flex flex-col gap-[var(--stack-2xs)] border-t border-line-subtle pt-[var(--stack-sm)]">
                {j.seances.map((s) => (
                  <li key={s.id}>
                    <Link href={`/sport/seance/${s.id}`} className="flex items-center justify-between gap-[var(--inline-md)] type-body-sm text-fg-secondary">
                      <span className="flex min-w-0 items-center gap-[var(--inline-sm)]">
                        <Icon name={s.type === "boxe" ? "sports_mma" : "fitness_center"} size={16} />
                        <span className="truncate">
                          {s.titre ?? s.type} · {s.etat === "faite" ? "terminée" : s.etat === "en_cours" ? "en cours" : "prévue"}
                        </span>
                      </span>
                      <span className="kv-mono shrink-0">{s.kcal > 0 ? `+${nf(s.kcal)} kcal` : "à l’issue de la séance"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Suggestions
            key={`${jour}-${j.consomme}`}
            jour={jour}
            modifiable={modifiable}
            initial={{ repas: suggestion.repas, budget_kcal: suggestion.budget_kcal, message: suggestion.message, suggestions: suggestion.suggestions }}
          />

          <RepasDuJour repas={j.repas} modifiable={modifiable} />

          <section className="grid grid-cols-2 gap-[var(--inline-md)]">
            <EntreeCarte href="/nutrition/recettes" icone="menu_book" titre="Recettes" detail="36 recettes" sous="Par repas, selon ton sport" />
            <EntreeCarte
              href="/reglages/nutrition"
              icone="tune"
              titre="Cibles"
              detail={`${nf(j.base)} kcal`}
              sous={`${nf(j.proteines_cible)} g de protéines`}
            />
          </section>
        </div>
      </ModuleFrame>
    </FournisseurAjout>
  );
}
