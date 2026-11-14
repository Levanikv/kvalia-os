import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { bilanJour, defiSemaine, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { enteteJour } from "./entete";
import { EnergieJour } from "./EnergieJour";
import { HeroSeance, TicketRepos } from "./HeroSeance";
import { Records } from "./Records";
import { ToastUrl } from "./ToastUrl";
import { decaler, jourDepuis, kcalPrevues, libelleFocus, seancesPourJour } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Sport — vue Jour (défaut), maquette « A01 · Home · séance du jour » : en-tête partagé avec Nutrition
 * (pastille du jour, semaine, bande de jours), ticket séance (5 états) → défi de la semaine → énergie → records.
 *
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

  const [entete, seances, params, { data: semaine }, bilan] = await Promise.all([
    enteteJour(supabase, jour, auj, "/sport"),
    seancesPourJour(supabase, jour),
    parametresSport(supabase, user.id),
    supabase.from("seances").select("id, jour, type, etat, kcal, created_at").gte("jour", lundi).lte("jour", dimanche).order("created_at"),
    bilanJour(supabase, user.id, jour),
  ]);
  const { programme, pos } = entete;
  // Première ouverture de Sport : ni programme, ni onboarding terminé ou passé → onboarding muscu.
  const ob = params.onboarding;
  if (!programme && !ob?.termine && !ob?.passe) redirect("/sport/bienvenue");
  const { poids } = await poidsActuel(supabase, user.id, params);
  const [prochaine, numeros] = await Promise.all([
    seances.length === 0
      ? supabase
          .from("seances")
          .select("id, jour, titre, type")
          .gt("jour", jour)
          .eq("etat", "prevue")
          .neq("type", "boxe")
          .order("jour")
          .limit(1)
          .maybeSingle()
          .then((r) => r.data)
      : null,
    // Rang de chaque séance de salle dans le programme (« 13/40 »).
    programme
      ? supabase
          .from("seances")
          .select("id, jour, type, created_at")
          .eq("programme_id", programme.id)
          .neq("type", "boxe")
          .order("jour")
          .then((r) => r.data ?? [])
      : [],
  ]);
  const numero = (id: string) => {
    const i = numeros.findIndex((x) => x.id === id);
    return i >= 0 ? { n: i + 1, total: numeros.length } : null;
  };

  const dansProgramme = pos && !pos.avant && !pos.apres;
  const semaineSeances = semaine ?? [];
  const defi = defiSemaine(semaineSeances);
  const kcalSeancePrevue = seances.filter((x) => x.etat !== "faite").reduce((a, x) => a + kcalPrevues(x, poids), 0);
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
      <Suspense>
        <ToastUrl />
      </Suspense>

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
            numero={numero(s.id)}
            rang={seances.length > 1 ? `${i + 1}/${seances.length}` : null}
          />
        ))}

        {seances.length === 0 && programme && (
          <TicketRepos prochaine={prochaine} semaine={{ faites: defi.faites, total: defi.total }} semaineNo={dansProgramme ? pos.semaine : null} />
        )}

        {/* Défi de la semaine : toutes les séances de salle de la semaine. */}
        {defi.total > 0 && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card-hero)] bg-surface-container-accent p-[var(--inset-lg)] text-fg-primary shadow-card">
            <div className="flex items-start justify-between gap-[var(--inline-md)]">
              <div>
                <p className="kv-overline">Défi de la semaine</p>
                <p className="mt-[var(--stack-xs)] type-title-lg">
                  {defi.releve ? "Défi relevé : " : ""}
                  {defi.total} séance{defi.total > 1 ? "s" : ""} de salle{defi.releve ? "" : " d’ici dimanche"}
                </p>
              </div>
              <p className="shrink-0 type-display-md">
                {defi.faites}/{defi.total}
              </p>
            </div>
            <div className="flex gap-[var(--inline-xs)]" aria-hidden>
              {Array.from({ length: defi.total }, (_, i) => (
                <span key={i} className={`h-2.5 flex-1 rounded-full ${i < defi.faites ? "bg-fg-primary" : "bg-data-track"}`} />
              ))}
            </div>
            <p className="kv-mono">
              {defi.releve
                ? "Toutes les séances de salle sont faites."
                : `Encore ${defi.total - defi.faites} séance${defi.total - defi.faites > 1 ? "s" : ""} cette semaine.`}
            </p>
          </section>
        )}

        <EnergieJour
          jour={jour === auj ? "aujourd’hui" : new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" })}
          cible={bilan.cible}
          consomme={bilan.consomme}
          brule={bilan.brule}
          seancePrevue={kcalSeancePrevue}
        />

        {!programme && ob?.termine && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)]">
            <p className="type-title-lg">Pas de programme actif</p>
            <p className="type-body-sm text-fg-secondary">Ton profil est prêt : l’agent recrée tes semaines en blocs de 4.</p>
            <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-primary kv-btn-lg kv-btn-block mt-[var(--stack-xs)]">
              <Icon name="auto_awesome" size={20} /> <span className="kv-btn-label">Créer mon programme</span>
            </Link>
          </section>
        )}

        {/* Records (l'historique complet est derrière « Historique ») */}
        <Records db={supabase} depuis={programme?.debut ?? decaler(auj, -56)} jusqua={auj} />
      </div>
    </ModuleFrame>
  );
}
