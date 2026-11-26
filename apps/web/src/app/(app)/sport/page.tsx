import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { bilanJour, defiSemaine, executer, listerDefis, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { Tuile } from "@/components/Tuile";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { DefisDuJour } from "./Defis";
import { enteteJour } from "./entete";
import { HeroSeance, TicketRepos } from "./HeroSeance";
import { Records } from "./Records";
import { FaireAujourdhui, ReporterSeance, type Occupes } from "./Reporter";
import { ToastUrl } from "./ToastUrl";
import { decaler, jourDepuis, kcalPrevues, seancesPourJour } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Sport — accueil du jour. Une chose à faire, en grand : le ticket de la séance (5 états) et, juste dessous, de
 * quoi la reporter. Puis deux tuiles de chiffres (la semaine, l'énergie du jour → Nutrition), les défis du jour et
 * les records. En-tête partagé avec Nutrition (sélecteur, date, bande de jours). Programme et exercices sont dans
 * la barre du bas : pas de carte en double ici.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const d = new Date(jour + "T12:00:00Z");
  const lundi = decaler(jour, -((d.getUTCDay() + 6) % 7));
  const dimanche = decaler(lundi, 6);

  // Au jour le jour : une séance prévue un jour passé et jamais commencée n'est pas perdue — la file reprend où elle
  // en était (outil recaler_programme). Sans séance manquée, c'est une seule lecture.
  await executer("recaler_programme", {}, { db: supabase, userId: user.id }).catch(() => null);

  const [entete, seances, params, { data: semaine }, bilan, defis] = await Promise.all([
    enteteJour(supabase, jour, auj, "/sport"),
    seancesPourJour(supabase, jour),
    parametresSport(supabase, user.id),
    supabase.from("seances").select("id, jour, type, etat, kcal, created_at").gte("jour", lundi).lte("jour", dimanche).order("created_at"),
    bilanJour(supabase, user.id, jour),
    listerDefis(supabase, user.id, jour),
  ]);
  const { programme, pos } = entete;
  // Première ouverture de Sport : ni programme, ni onboarding terminé ou passé → onboarding muscu.
  const ob = params.onboarding;
  if (!programme && !ob?.termine && !ob?.passe) redirect("/sport/bienvenue");
  // Une seule vague de requêtes en parallèle (poids, prochaine séance, rangs) au lieu de deux à la suite.
  const [{ poids }, prochaine, numeros, { data: aVenir }] = await Promise.all([
    poidsActuel(supabase, user.id, params),
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
    // Séances de salle prévues dans les huit jours : pour proposer un report sans empiler deux séances.
    supabase.from("seances").select("jour, titre").gte("jour", auj).lte("jour", decaler(auj, 8)).eq("etat", "prevue").neq("type", "boxe"),
  ]);
  const occupes: Occupes = Object.fromEntries((aVenir ?? []).map((x) => [x.jour, x.titre ?? "Séance"]));
  const numero = (id: string) => {
    const i = numeros.findIndex((x) => x.id === id);
    return i >= 0 ? { n: i + 1, total: numeros.length } : null;
  };

  const dansProgramme = pos && !pos.avant && !pos.apres;
  const semaineSeances = semaine ?? [];
  const defi = defiSemaine(semaineSeances);
  const kcalSeancePrevue = seances.filter((x) => x.etat !== "faite").reduce((a, x) => a + kcalPrevues(x, poids), 0);

  const reste = bilan.cible - bilan.consomme;
  const etapesOnboarding = 15;
  const defisDuJour = defis.filter((d) => d.du_jour);
  const sansProgrammePret = !programme && !!ob?.termine;

  return (
    <ModuleFrame
      module="sport"
      surTitre={entete.surTitre}
      titre={entete.titre}
      action={entete.action}
      barre={entete.barre}
      jour={jour === auj ? undefined : jour}
      pied={
        sansProgrammePret ? (
          <Link href="/sport/programme/nouveau" className="kv-btn kv-btn-primary kv-btn-xl kv-btn-block">
            <Icon name="auto_awesome" size={20} /> <span className="kv-btn-label">Créer mon programme</span>
          </Link>
        ) : undefined
      }
    >
      <RealtimeRefresh tables={["seances", "exercices_seance", "defis", "defis_suivi"]} />
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
            className="kv-ground block overflow-hidden rounded-[var(--radius-card-hero)] bg-surface-page text-fg-primary border border-line-subtle"
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
        {/* Empêchement : une séance de salle pas encore commencée se reporte, le programme suit. */}
        {seances
          .filter((s) => s.etat === "prevue" && s.type !== "boxe" && s.jour >= auj)
          .slice(0, 1)
          .map((s) => (
            <ReporterSeance key={s.id} seance={{ id: s.id, titre: s.titre, jour: s.jour }} aujourdhui={auj} occupes={occupes} />
          ))}

        {seances.length === 0 && programme && (
          <TicketRepos prochaine={prochaine} semaine={{ faites: defi.faites, total: defi.total }} semaineNo={dansProgramme ? pos.semaine : null} />
        )}
        {seances.length === 0 && programme && prochaine && jour === auj && (
          <FaireAujourdhui seance={{ id: prochaine.id, titre: prochaine.titre, jour: prochaine.jour }} aujourdhui={auj} />
        )}

        {/* Deux chiffres, pas plus : où en est la semaine, ce qu'il reste à manger aujourd'hui. */}
        <section className="grid grid-cols-2 gap-[var(--inline-md)]" aria-label="En un coup d’œil">
          {defi.total > 0 ? (
            <Tuile
              titre="Semaine"
              icone="local_fire_department"
              valeur={defi.faites}
              unite={`/ ${defi.total} séance${defi.total > 1 ? "s" : ""}`}
              part={defi.faites / defi.total}
              detail={defi.releve ? "Défi relevé" : `Encore ${defi.total - defi.faites} d’ici dimanche`}
              href="/sport/programme"
            />
          ) : (
            <Tuile titre="Semaine" icone="local_fire_department" valeur="—" detail="Aucune séance prévue" href="/sport/programme" />
          )}
          <Tuile
            module="nutrition"
            titre="Énergie"
            icone="restaurant"
            valeur={Math.abs(reste).toLocaleString("fr-FR")}
            unite="kcal"
            part={bilan.cible > 0 ? bilan.consomme / bilan.cible : 0}
            detail={
              reste < 0
                ? "Au-dessus de ta cible"
                : kcalSeancePrevue > 0
                  ? `Restantes, + ${kcalSeancePrevue} avec la séance`
                  : bilan.brule > 0
                    ? `Restantes, dont ${bilan.brule} de sport`
                    : "Restantes à manger"
            }
            href={jour === auj ? "/nutrition" : `/nutrition?jour=${jour}`}
          />
        </section>

        {defisDuJour.length > 0 && <DefisDuJour defis={defisDuJour} jour={jour} aujourdhui={auj} modifiable={jour <= auj} />}

        {sansProgrammePret && (
          <section className="flex flex-col gap-[var(--stack-sm)] rounded-[var(--radius-card)] border border-dashed border-line-strong p-[var(--inset-lg)]">
            <p className="type-title-lg">Pas de programme actif</p>
            <p className="type-body-sm text-fg-secondary">Ton profil est prêt : l’agent recrée tes semaines en blocs de 4.</p>
          </section>
        )}

        {/* Records (l'historique complet est derrière « Historique ») */}
        <Suspense fallback={<div className="squelette h-48 rounded-[var(--radius-card)] bg-surface-container-sunken" />}>
          <Records db={supabase} depuis={programme?.debut ?? decaler(auj, -56)} jusqua={auj} />
        </Suspense>
      </div>
    </ModuleFrame>
  );
}
