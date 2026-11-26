import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@kvalia/core";
import {
  chargerModeles,
  choisirMethode,
  dureeModele,
  LIBELLES,
  listerDefis,
  MethodeId,
  parametresNutrition,
  parametresSport,
  phasesProgramme,
  poidsActuel,
} from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Segments } from "@/components/Segments";
import { aujourdhui, session } from "@/lib/session";
import { DefisProgramme } from "../Defis";
import { libelleFocus, libelleType, positionProgramme, trierParJour } from "../lib";
import { ORDRE_SEMAINE, Phases, SemaineType, type JourType } from "./Phases";

type Db = SupabaseClient<Database>;
type Rythme = { salle?: number; boxe?: number; objectif?: string; niveau?: string; duree_min?: number; methode?: string };

type Vue = "semaine" | "plan" | "seances";
type Props = { searchParams: Promise<{ vue?: string }> };

const VUES = [
  { cle: "semaine", label: "Semaine", href: "/sport/programme" },
  { cle: "plan", label: "Plan", href: "/sport/programme?vue=plan" },
  { cle: "seances", label: "Mes séances", href: "/sport/programme?vue=seances" },
] as const;

/**
 * Onglet Programme : tout ce qui se planifie, en trois vues (`?vue=`), une seule à l'écran.
 * - **Semaine** (défaut) : la carte du programme (objectif, rythme, semaine n / N), la semaine jour par jour, les défis.
 * - **Plan** : les chiffres du programme, les phases, toutes les semaines, la méthode, l'historique, « Nouveau programme ».
 * - **Mes séances** : les séances perso (créer, mettre au programme) — « Créer une séance » en barre d'action.
 * « Modifier le programme » est le bouton de l'en-tête. Sans programme : « Construis ton programme » (maquette 02)
 * et Mes séances.
 */
export default async function Page({ searchParams }: Props) {
  const sp = await searchParams;
  const vue: Vue = sp.vue === "plan" || sp.vue === "seances" ? sp.vue : "semaine";
  const { supabase, user } = await session();
  const auj = aujourdhui();
  const { data: prog } = await supabase.from("programmes").select("*").eq("actif", true).maybeSingle();

  if (!prog) return sansProgramme(supabase, user.id, vue === "seances");

  const [{ data: brutes }, modeles, reglages, defis] = await Promise.all([
    supabase
      .from("seances")
      .select("id, jour, type, titre, etat, bloc, semaine, focus, duree_min, kcal, created_at, exercices_seance(id)")
      .eq("programme_id", prog.id)
      .order("jour"),
    chargerModeles(supabase, user.id),
    parametresSport(supabase, user.id),
    listerDefis(supabase, user.id, auj),
  ]);
  const seances = trierParJour(brutes ?? []);
  const r = (prog.rythme ?? {}) as Rythme;
  const pos = positionProgramme(prog, auj);
  const nbSemaines = pos?.total ?? Math.max(1, ...seances.map((s) => s.semaine ?? 1));
  const semaineCourante = pos?.avant ? 1 : pos?.apres ? nbSemaines : (pos?.semaine ?? 1);

  // Focus de chaque semaine (séances réelles ; à défaut le plan théorique).
  const theorique = phasesProgramme({ objectif: (r.objectif as "force") ?? "hypertrophie", semaines: nbSemaines });
  const semainesFocus = theorique.map((t) => {
    const ss = seances.filter((s) => s.semaine === t.semaine);
    return { semaine: t.semaine, focus: ss.find((s) => s.type !== "boxe")?.focus ?? ss[0]?.focus ?? t.focus };
  });
  const focusCourant = semainesFocus.find((x) => x.semaine === semaineCourante)?.focus ?? null;

  // Semaine type = la semaine en cours, jour par jour.
  const cetteSemaine = seances.filter((s) => s.semaine === semaineCourante);
  const jours: JourType[] = ORDRE_SEMAINE.map((j) => {
    const ss = cetteSemaine.filter((s) => new Date(s.jour + "T12:00:00Z").getUTCDay() === j);
    if (!ss.length) return { jour: j, titre: null, detail: "" };
    const nbExos = ss.reduce((a, s) => a + (s.exercices_seance?.length ?? 0), 0);
    return {
      jour: j,
      titre: ss.map((s) => s.titre ?? libelleType(s.type)).join(" + "),
      detail: [nbExos ? `${nbExos} exercices` : libelleType(ss[0].type), `${ss[0].duree_min ?? r.duree_min ?? "—"} min`].join(" · "),
      href: `/sport/seance/${ss[0].id}`,
    };
  });

  const faites = seances.filter((s) => s.etat === "faite");
  const passees = seances.filter((s) => s.jour < auj);
  const regularite = passees.length ? Math.round((passees.filter((s) => s.etat === "faite").length / passees.length) * 100) : null;
  const kcal = faites.reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const parSemaine = new Map<number, typeof seances>();
  for (const s of seances) parSemaine.set(s.semaine ?? 0, [...(parSemaine.get(s.semaine ?? 0) ?? []), s]);
  const finTexte = prog.fin ? new Date(prog.fin + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
  const objectif = r.objectif ? (LIBELLES.objectif[r.objectif] ?? prog.nom) : prog.nom;
  const etat = pos?.avant ? "À venir" : pos?.apres ? "Terminé" : "Actif";
  // Méthode suivie : celle enregistrée avec le programme ; pour un programme plus ancien, celle de son objectif et niveau.
  const idMethode = MethodeId.safeParse(r.methode);
  const methode = choisirMethode({
    objectif: r.objectif ?? "hypertrophie",
    niveau: r.niveau ?? "intermediate",
    methode: idMethode.success ? idMethode.data : null,
  });

  return (
    <ModuleFrame
      module="sport"
      surTitre={`${objectif} · semaine ${semaineCourante} / ${nbSemaines}`}
      titre="Programme"
      action={
        <Link
          href="/sport/programme/modifier"
          aria-label="Modifier le programme"
          className="kv-iconbtn border border-line-default bg-surface-container-default text-fg-primary"
        >
          <Icon name="tune" size={22} />
        </Link>
      }
      pied={vue === "seances" ? <BoutonCreerSeance /> : undefined}
    >
      <RealtimeRefresh tables={["seances", "programmes", "defis", "defis_suivi"]} />
      <div className="flex flex-col gap-[var(--stack-lg)]">
        <Segments items={VUES} actif={vue} label="Vue du programme" />

        {vue === "semaine" && (
          <div className="cascade flex flex-col gap-[var(--stack-lg)]">
            {/* Programme en cours */}
            <section
              data-module="sport"
              data-theme="dark"
              className="kv-ground overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary border border-line-subtle"
            >
              <div className="kv-ground-content flex flex-col gap-[var(--stack-md)] p-[var(--inset-lg)]">
                <div className="flex items-center justify-between gap-[var(--inline-md)]">
                  <span className={`kv-tag ${etat === "Actif" ? "kv-tag-success" : "kv-tag-neutral"}`}>
                    {etat === "Actif" && <Icon name="check" size={14} />} {etat}
                  </span>
                  <span className="kv-mono">{nbSemaines} semaines</span>
                </div>
                <div>
                  <h2 className="type-display-lg">{objectif}</h2>
                  <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
                    {[
                      libelleFocus(focusCourant),
                      r.salle ? `${r.salle} salle / sem.` : null,
                      r.boxe ? `${r.boxe} boxe` : null,
                      r.duree_min ? `${r.duree_min} min` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex flex-col gap-[var(--stack-xs)]">
                  <div className="flex items-baseline justify-between">
                    <span className="type-label-lg">
                      Semaine {semaineCourante}
                      <span className="text-fg-tertiary"> / {nbSemaines}</span>
                    </span>
                    {finTexte && <span className="kv-mono">fin {finTexte}</span>}
                  </div>
                  <div className="kv-progress-track" aria-hidden>
                    <div
                      className="kv-progress-fill pousse-x bg-action-primary"
                      style={{ width: `${(Math.min(semaineCourante, nbSemaines) / nbSemaines) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            <SemaineType jours={jours} note="touche une séance" />

            <DefisProgramme defis={defis} finProgramme={prog.fin} />
          </div>
        )}

        {vue === "plan" && (
          <div className="cascade flex flex-col gap-[var(--stack-lg)]">
            {/* Infos secondaires */}
            <section className="grid grid-cols-3 gap-[var(--inline-md)]">
              <div className="kv-stat">
                <span className="kv-overline">Séances</span>
                <span className="kv-stat-row">
                  <span className="kv-stat-value">{faites.length}</span>
                  <span className="kv-mono">/ {seances.length}</span>
                </span>
              </div>
              <div className="kv-stat">
                <span className="kv-overline">Brûlées</span>
                <span className="kv-stat-row">
                  <span className="kv-stat-value">{kcal >= 10000 ? `${Math.round(kcal / 1000)}k` : kcal.toLocaleString("fr-FR")}</span>
                  <span className="kv-mono">kcal</span>
                </span>
              </div>
              <div className="kv-stat">
                <span className="kv-overline">Régularité</span>
                <span className="kv-stat-row">
                  <span className="kv-stat-value">{regularite ?? "—"}</span>
                  {regularite !== null && <span className="kv-mono">%</span>}
                </span>
              </div>
            </section>

            <Phases semaines={semainesFocus} semaineCourante={pos?.avant || pos?.apres ? null : semaineCourante} />

            <section className="flex flex-col gap-[var(--stack-sm)]">
              <h2 className="px-[var(--inline-xs)] type-title-lg">Toutes les semaines</h2>
              <ul className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
                {[...parSemaine.keys()]
                  .sort((a, b) => a - b)
                  .map((n) => {
                    const ss = parSemaine.get(n) ?? [];
                    const ok = ss.filter((s) => s.etat === "faite").length;
                    const courante = n === semaineCourante;
                    const focus = semainesFocus.find((x) => x.semaine === n)?.focus ?? null;
                    return (
                      <li key={n} className="border-b border-line-subtle last:border-b-0">
                        <details open={courante} className="group">
                          <summary className="tap flex cursor-pointer list-none items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
                            <span
                              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full type-label-md ${
                                courante
                                  ? "bg-action-primary text-fg-on-brand"
                                  : ok === ss.length
                                    ? "bg-feedback-success-subtle text-feedback-success-text"
                                    : "bg-action-tertiary text-fg-secondary"
                              }`}
                            >
                              {ok === ss.length && !courante ? <Icon name="check" size={16} /> : n}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block type-title-sm">
                                Semaine {n} <span className="text-fg-tertiary">· bloc {ss[0]?.bloc ?? Math.ceil(n / 4)}</span>
                              </span>
                              <span className="block kv-mono">
                                {libelleFocus(focus)} · {new Date(ss[0].jour + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                            </span>
                            <span className="kv-mono">
                              {ok}/{ss.length}
                            </span>
                            <Icon name="expand_more" size={20} className="text-icon-tertiary transition-transform group-open:rotate-180" />
                          </summary>
                          <ul className="pb-[var(--inset-xs)]">
                            {ss.map((s) => (
                              <li key={s.id}>
                                <Link href={`/sport/seance/${s.id}`} className="tap flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)]">
                                  <Icon
                                    name={s.etat === "faite" ? "check_circle" : s.type === "boxe" ? "sports_mma" : "fitness_center"}
                                    size={20}
                                    filled={s.etat === "faite"}
                                    className={s.etat === "faite" ? "text-feedback-success-text" : s.jour === auj ? "text-fg-brand" : "text-icon-tertiary"}
                                  />
                                  <span className="min-w-0 flex-1">
                                    <span className={`block truncate type-body-md ${s.jour === auj ? "font-semibold" : ""}`}>
                                      {s.titre ?? libelleType(s.type)}
                                    </span>
                                    <span className="block kv-mono">
                                      {new Date(s.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} · {s.duree_min} min
                                      {s.etat === "faite" ? ` · ${Number(s.kcal ?? 0)} kcal` : ""}
                                    </span>
                                  </span>
                                  <Icon name="chevron_right" size={18} className="text-icon-tertiary" />
                                </Link>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </li>
                    );
                  })}
              </ul>
            </section>

            {/* Méthode d'entraînement et ses sources */}
            <details className="group overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
              <summary className="tap flex cursor-pointer list-none items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
                  <Icon name="menu_book" size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block kv-overline">Méthode</span>
                  <span className="block truncate type-title-sm">{methode.nom}</span>
                </span>
                <Icon name="expand_more" size={20} className="text-icon-tertiary transition-transform group-open:rotate-180" />
              </summary>
              <div className="flex flex-col gap-[var(--stack-sm)] px-[var(--inset-md)] pb-[var(--inset-md)]">
                <p className="type-body-sm text-fg-secondary">{methode.resume}</p>
                <p className="type-body-sm">
                  <span className="text-fg-brand">Progression · </span>
                  {methode.progression}
                </p>
                <ul className="flex flex-col gap-[var(--stack-2xs)] border-t border-line-subtle pt-[var(--stack-sm)]">
                  {methode.sources.map((x) => (
                    <li key={x.url}>
                      <a href={x.url} target="_blank" rel="noreferrer" className="flex items-start gap-[var(--inline-sm)] type-body-sm text-fg-link">
                        <Icon name="open_in_new" size={16} className="mt-0.5 shrink-0" />
                        <span>{x.titre}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <Link
              href="/sport/historique"
              className="tap flex items-center gap-[var(--inline-lg)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
                <Icon name="history" size={20} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block kv-overline">Historique</span>
                <span className="block truncate type-title-sm">
                  {faites.length} séance{faites.length > 1 ? "s" : ""} terminée{faites.length > 1 ? "s" : ""}
                </span>
              </span>
              <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
            </Link>

            <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-secondary kv-btn-lg kv-btn-block">
              <Icon name="auto_awesome" size={20} />
              <span className="kv-btn-label">Nouveau programme</span>
            </Link>
          </div>
        )}

        {vue === "seances" && <MesSeances modeles={Object.values(modeles)} perso={reglages.seances_perso} />}
      </div>
    </ModuleFrame>
  );
}

/** Maquette 02 · Onglet Programmes vide : construire son programme, comment ça marche, ce que l'IA sait déjà. */
async function sansProgramme(supabase: Db, userId: string, mesSeances: boolean) {
  const [params, modeles] = await Promise.all([parametresSport(supabase, userId), chargerModeles(supabase, userId)]);
  const [{ poids, source }, nutrition] = await Promise.all([poidsActuel(supabase, userId, params), parametresNutrition(supabase, userId)]);
  const connu = [
    source !== "defaut" ? `${String(poids).replace(".", ",")} kg` : null,
    `${nutrition.cible_kcal.toLocaleString("fr-FR")} kcal / jour`,
    LIBELLES.niveau[params.niveau] ? `Niveau ${LIBELLES.niveau[params.niveau].toLowerCase()}` : null,
    params.profil?.lieu ? { salle: "Salle", maison: "Maison", les_deux: "Salle + maison" }[params.profil.lieu] : null,
    params.profil?.douleurs?.length ? `À ménager : ${params.profil.douleurs.join(", ")}` : null,
  ].filter(Boolean) as string[];
  const vues = [
    { cle: "programme", label: "Programme", href: "/sport/programme" },
    { cle: "seances", label: "Mes séances", href: "/sport/programme?vue=seances" },
  ] as const;
  return (
    <ModuleFrame
      module="sport"
      surTitre="Aucun programme actif"
      titre="Programme"
      pied={
        mesSeances ? (
          <BoutonCreerSeance />
        ) : (
          <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
            <span className="kv-btn-label">Créer mon programme</span>
            <span className="kv-btn-end">
              <Icon name="arrow_forward" size={22} />
            </span>
          </Link>
        )
      }
    >
      <div className="flex flex-col gap-[var(--stack-lg)]">
        <Segments items={vues} actif={mesSeances ? "seances" : "programme"} label="Vue du programme" />
        {mesSeances ? (
          <MesSeances modeles={Object.values(modeles)} perso={params.seances_perso} />
        ) : (
          <div className="flex flex-col gap-[var(--stack-lg)]">
            <Link
              href="/sport/programme/nouveau"
              data-module="sport"
              data-theme="dark"
              className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary border border-line-subtle active:opacity-95"
            >
              <div className="kv-ground-content flex flex-col gap-[var(--stack-lg)] p-[var(--inset-lg)]">
                <div className="flex items-center justify-between">
                  <span className="kv-tag kv-tag-neutral">Aucun programme</span>
                  <span className="kv-mono">3 questions · 1 min</span>
                </div>
                <div>
                  <h2 className="type-display-lg">Construis ton programme.</h2>
                  <p className="mt-[var(--stack-xs)] type-body-md text-fg-secondary">
                    Tu réponds à l’essentiel, l’IA s’occupe du reste : séances, charges, progression et ajustements chaque semaine.
                  </p>
                </div>
              </div>
            </Link>

            <section className="flex flex-col gap-[var(--stack-sm)]">
              <h2 className="px-[var(--inline-xs)] type-title-lg">Comment ça marche</h2>
              <ol className="overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
                {[
                  ["3 questions", "Objectif, échéance, rythme. Ton profil est déjà connu."],
                  ["Proposition", "Phases, semaine type et durée : tu vois avant de valider."],
                  ["Génération", "L’IA construit les séances, les exercices et les charges."],
                  ["C’est parti", "Les séances arrivent dans Sport, jour par jour."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-[var(--inline-lg)] border-b border-line-subtle px-[var(--inset-md)] py-[var(--inset-sm)] last:border-b-0">
                    <span className="kv-mono pt-0.5 !text-fg-brand">{String(i + 1).padStart(2, "0")}</span>
                    <span>
                      <span className="block type-title-sm">{t}</span>
                      <span className="block type-body-sm text-fg-secondary">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
            </section>

            {connu.length > 0 && (
              <section className="flex flex-col gap-[var(--stack-sm)]">
                <h2 className="px-[var(--inline-xs)] type-title-lg">Ce que l’IA sait déjà</h2>
                <div className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)]">
                  <p className="type-body-sm text-fg-secondary">Récupéré depuis ton profil et tes autres apps : pas besoin de le redemander.</p>
                  <div className="flex flex-wrap gap-[var(--inline-sm)]">
                    {connu.map((c) => (
                      <span key={c} className="kv-tag kv-tag-neutral">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </ModuleFrame>
  );
}

/** « Créer une séance » : l'action de la vue Mes séances, en barre fixe. */
function BoutonCreerSeance() {
  return (
    <Link href="/sport/ma-seance/nouvelle" className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
      <Icon name="add" size={22} />
      <span className="kv-btn-label">Créer une séance</span>
    </Link>
  );
}

const NOMS_JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

/** « Mes séances » : séances perso enregistrées (et où elles sont au programme), créer une séance. */
function MesSeances({
  modeles,
  perso,
}: {
  modeles: Array<{ id: string; nom: string; exercices: Array<{ series: number; repos_s: number }> }>;
  perso: Array<{ jour: number; modele_id: string }>;
}) {
  return (
    <section className="flex flex-col gap-[var(--stack-sm)]" aria-label="Mes séances">
      <p className="px-[var(--inline-xs)] type-body-sm text-fg-secondary">
        Tes séances à toi : enregistre-les une fois, mets-les au programme un jour fixe ou ponctuellement.
      </p>
      {modeles.length === 0 ? (
        <Link
          href="/sport/ma-seance/nouvelle"
          className="flex items-center gap-[var(--inline-lg)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-md)]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-container-brand-subtle text-fg-brand">
            <Icon name="add" size={22} />
          </span>
          <span>
            <span className="block type-title-sm">Crée ta propre séance</span>
            <span className="block type-body-sm text-fg-secondary">Tes exercices, tes séries, ton ordre.</span>
          </span>
        </Link>
      ) : (
        <ul className="cascade overflow-hidden rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default">
          {modeles.map((m) => {
            const jours = perso.filter((x) => x.modele_id === m.id).map((x) => NOMS_JOURS[x.jour]);
            return (
              <li key={m.id} className="border-b border-line-subtle last:border-b-0">
                <Link href={`/sport/ma-seance/${m.id}`} className="tap flex items-center gap-[var(--inline-lg)] px-[var(--inset-md)] py-[var(--inset-sm)]">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-action-primary text-fg-on-brand">
                    <Icon name="fitness_center" size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate type-title-sm">{m.nom}</span>
                    <span className="block kv-mono">
                      {m.exercices.length} exercices · ≈ {dureeModele(m.exercices)} min{jours.length ? ` · chaque ${jours.join(", ")}` : ""}
                    </span>
                  </span>
                  <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
