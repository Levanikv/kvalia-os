import Link from "next/link";
import { redirect } from "next/navigation";
import { bilanJour, LIBELLES, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { enteteJour } from "./entete";
import { HeroSeance } from "./HeroSeance";
import { decaler, jourDepuis, kcalPrevues, libelleFocus, libelleType, seancesPourJour } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

const JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

/**
 * Sport — vue Jour (défaut). En-tête partagé avec Nutrition (pastille du jour, semaine, bande de jours),
 * puis : le programme suivi → la ou les séances du jour (muscu + boxe possibles) → la semaine en cours →
 * historique et énergie. Programme, Exercices et Nutrition sont dans la barre du bas : pas de carte en double.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const d = new Date(jour + "T12:00:00Z");
  const lundi = decaler(jour, -((d.getUTCDay() + 6) % 7));
  const dimanche = decaler(lundi, 6);

  const [entete, seances, params, { data: semaine }, { data: faitesMois }, bilan] = await Promise.all([
    enteteJour(supabase, jour, auj, "/sport"),
    seancesPourJour(supabase, jour),
    parametresSport(supabase, user.id),
    supabase.from("seances").select("id, jour, type, etat, kcal, created_at").gte("jour", lundi).lte("jour", dimanche).order("created_at"),
    supabase
      .from("seances")
      .select("kcal")
      .eq("etat", "faite")
      .gte("jour", jour.slice(0, 8) + "01")
      .lte("jour", jour.slice(0, 8) + "31"),
    bilanJour(supabase, user.id, jour),
  ]);
  const { programme, pos } = entete;
  // Première ouverture de Sport : ni programme, ni onboarding terminé ou passé → onboarding muscu.
  const ob = params.onboarding;
  if (!programme && !ob?.termine && !ob?.passe) redirect("/sport/bienvenue");
  const { poids } = await poidsActuel(supabase, user.id, params);
  const prochaine =
    seances.length === 0
      ? (await supabase.from("seances").select("id, jour, titre, type").gt("jour", jour).eq("etat", "prevue").order("jour").limit(1).maybeSingle()).data
      : null;

  const rythme = programme?.rythme as { salle?: number; boxe?: number; objectif?: string; niveau?: string } | null;
  const dansProgramme = pos && !pos.avant && !pos.apres;
  const kcalMois = (faitesMois ?? []).reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const moisLabel = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { month: "long" });
  const semaineSeances = semaine ?? [];
  const faitesSemaine = semaineSeances.filter((s) => s.etat === "faite");
  const kcalSemaine = faitesSemaine.reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const focusJour = seances.find((s) => s.type !== "boxe")?.focus ?? seances[0]?.focus ?? null;

  const titreDate = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const surTitre = dansProgramme
    ? `Sport · bloc ${libelleFocus(focusJour)?.toLowerCase() ?? pos.bloc} S${pos.semaine}/${pos.total ?? "?"}`
    : programme && pos?.avant
      ? "Sport · programme à venir"
      : "Sport";
  const etapesOnboarding = 13;

  return (
    <ModuleFrame module="sport" surTitre={surTitre} titre={titreDate.charAt(0).toUpperCase() + titreDate.slice(1)} action={entete.action} barre={entete.barre}>
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />

      <div className="flex flex-col gap-[var(--stack-lg)]">
        {/* Onboarding passé (« Plus tard ») : la Home propose de reprendre là où on s'est arrêté. */}
        {!programme && ob?.passe && !ob.termine && (
          <Link
            href="/sport/bienvenue?reprendre=1"
            data-module="sport"
            data-theme="dark"
            className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary shadow-raised"
          >
            <div className="kv-ground-content flex flex-col gap-[var(--stack-lg)] p-[var(--inset-lg)]">
              <div className="flex items-baseline justify-between">
                <span className="type-display-lg">
                  {String(Math.max(0, (ob.etape ?? 1) - 1)).padStart(2, "0")}/{etapesOnboarding}
                </span>
                <span className="kv-mono">≈ {Math.max(1, Math.round((etapesOnboarding - (ob.etape ?? 1) + 1) * 0.2))} min</span>
              </div>
              <div className="kv-progress-track" aria-hidden>
                <div className="kv-progress-fill bg-action-primary" style={{ width: `${(Math.max(0, (ob.etape ?? 1) - 1) / etapesOnboarding) * 100}%` }} />
              </div>
              <div>
                <p className="type-title-lg">Ton plan attend ta réponse.</p>
                <p className="mt-[var(--stack-xs)] type-body-sm text-fg-secondary">
                  Sans profil, pas de séances ni de charges. On reprend là où tu t’es arrêté.
                </p>
              </div>
              <span className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block kv-btn-has-end">
                <span className="kv-btn-label">Reprendre</span>
                <span className="kv-btn-end">
                  <Icon name="arrow_forward" size={22} />
                </span>
              </span>
            </div>
          </Link>
        )}

        {/* Séance(s) du jour */}
        {seances.map((s, i) => (
          <HeroSeance
            key={s.id}
            seance={s}
            kcalPrevues={kcalPrevues(s, poids)}
            estAujourdhui={jour === auj}
            semaineNo={dansProgramme ? pos.semaine : null}
            totalSemaines={pos?.total ?? null}
            rang={seances.length > 1 ? `${i + 1}/${seances.length}` : null}
          />
        ))}

        {seances.length === 0 && programme && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-lg)] shadow-card">
            <span className="kv-tag kv-tag-neutral self-start">Repos</span>
            <p className="type-title-lg">Récupération active</p>
            <p className="type-body-sm text-fg-secondary">Marche, mobilité, sommeil. Les muscles se construisent aujourd’hui.</p>
            {prochaine && (
              <Link
                href={`/sport?jour=${prochaine.jour}`}
                className="tap mt-[var(--stack-xs)] flex items-center justify-between gap-[var(--inline-md)] rounded-[var(--radius-input)] bg-surface-container-sunken px-[var(--inset-sm)] type-body-sm"
              >
                <span className="truncate">
                  Prochaine : <strong>{prochaine.titre}</strong> ·{" "}
                  {new Date(prochaine.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                </span>
                <Icon name="chevron_right" size={18} className="text-icon-tertiary" />
              </Link>
            )}
          </section>
        )}

        {!programme && ob?.termine && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)]">
            <p className="type-title-lg">Pas de programme actif</p>
            <p className="type-body-sm text-fg-secondary">Ton profil est prêt : l’agent recrée tes semaines en blocs de 4.</p>
            <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block mt-[var(--stack-xs)]">
              <Icon name="auto_awesome" size={20} /> <span className="kv-btn-label">Créer mon programme</span>
            </Link>
          </section>
        )}

        {/* La semaine */}
        {semaineSeances.length > 0 && (
          <section className="rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default p-[var(--inset-md)] shadow-card">
            <div className="flex items-baseline justify-between">
              <h2 className="kv-overline">{dansProgramme ? `Semaine ${pos.semaine}` : "Cette semaine"}</h2>
              <p className="kv-mono">
                {faitesSemaine.length}/{semaineSeances.length} séances · {kcalSemaine.toLocaleString("fr-FR")} kcal
              </p>
            </div>
            <ol className="mt-[var(--stack-md)] grid grid-cols-7 gap-[var(--inline-xs)]">
              {JOURS_COURTS.map((l, i) => {
                const j = decaler(lundi, i);
                const ss = semaineSeances.filter((s) => s.jour === j);
                const actif = j === jour;
                const faite = ss.length > 0 && ss.every((s) => s.etat === "faite");
                return (
                  <li key={j}>
                    <Link
                      href={`/sport?jour=${j}`}
                      scroll={false}
                      aria-current={actif ? "date" : undefined}
                      aria-label={`${new Date(j + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })} : ${ss.length ? (faite ? "séance faite" : "séance prévue") : "repos"}`}
                      className="flex flex-col items-center gap-[var(--stack-xs)]"
                    >
                      <span
                        className={`flex h-10 w-full items-center justify-center rounded-[var(--radius-md)] ${
                          ss.length === 0
                            ? "border border-dashed border-line-strong"
                            : faite
                              ? "bg-feedback-success text-icon-inverse"
                              : "bg-action-primary text-icon-on-brand"
                        } ${actif ? "ring-2 ring-focus-ring ring-offset-2 ring-offset-surface-container-default" : ""}`}
                      >
                        {faite && <Icon name="check" size={18} />}
                      </span>
                      <span className={`kv-mono ${j === auj ? "text-fg-brand" : ""}`}>{l}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Historique et énergie */}
        <section className="grid grid-cols-2 gap-[var(--inline-md)]">
          <Link href="/sport/historique" className="kv-stat">
            <span className="kv-overline">Historique · {moisLabel}</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{(faitesMois ?? []).length}</span>
              <span className="kv-mono">séance{(faitesMois ?? []).length > 1 ? "s" : ""}</span>
            </span>
            <span className="kv-mono">{kcalMois.toLocaleString("fr-FR")} kcal</span>
          </Link>
          <Link href={`/nutrition?jour=${jour}`} className="kv-stat" data-module="nutrition">
            <span className="kv-overline">Énergie · cible</span>
            <span className="kv-stat-row">
              <span className="kv-stat-value">{bilan.cible.toLocaleString("fr-FR")}</span>
              <span className="kv-mono">kcal</span>
            </span>
            <span className="kv-mono">{bilan.brule > 0 ? `dont +${bilan.brule} sport` : "Cible du jour"}</span>
          </Link>
        </section>
        {seances.length > 0 && (
          <p className="kv-mono text-center">
            {seances.map((s) => s.titre ?? libelleType(s.type)).join(" · ")} — {params.duree_min} min visées
          </p>
        )}
      </div>
    </ModuleFrame>
  );
}
