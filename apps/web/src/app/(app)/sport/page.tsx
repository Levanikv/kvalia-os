import Link from "next/link";
import { bilanJour, LIBELLES, parametresSport, poidsActuel } from "@kvalia/core";
import { BandeJours } from "@/components/BandeJours";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { EntreeCarte } from "./EntreeCarte";
import { HeroSeance } from "./HeroSeance";
import { dateLongue, jourDepuis, kcalPrevues, marquesAutour, positionProgramme, seancePourJour } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Sport — vue Jour (défaut). Bande de jours scrollable (jour sélectionné centré), libellé « Semaine x / y »,
 * hero = la séance du jour ; dessous, les points d'entrée en cartes (Programme, Historique, Exercices, Nutrition).
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);

  const [seance, params, marques, { data: programme }, { data: faitesMois }, { count: nbExos }, bilan] = await Promise.all([
    seancePourJour(supabase, jour),
    parametresSport(supabase, user.id),
    marquesAutour(supabase, jour),
    supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle(),
    supabase
      .from("seances")
      .select("kcal, duree_min")
      .eq("etat", "faite")
      .gte("jour", jour.slice(0, 8) + "01")
      .lte("jour", jour.slice(0, 8) + "31"),
    supabase.from("exercices_ref").select("id", { count: "exact", head: true }),
    bilanJour(supabase, user.id, jour),
  ]);
  const { poids } = await poidsActuel(supabase, user.id, params);
  const prochaine = !seance
    ? (await supabase.from("seances").select("id, jour, titre, type").gt("jour", jour).eq("etat", "prevue").order("jour").limit(1).maybeSingle()).data
    : null;

  const pos = positionProgramme(programme, jour);
  const rythme = programme?.rythme as { salle?: number; boxe?: number; objectif?: string } | null;
  const kcalMois = (faitesMois ?? []).reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const moisLabel = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { month: "long" });

  return (
    <ModuleFrame
      module="sport"
      titre="Sport"
      sousTitre={dateLongue(jour)}
      action={
        jour !== auj ? (
          <Link href="/sport" className="tap flex items-center rounded-full bg-surface-2 px-3 text-sm font-medium">
            Aujourd’hui
          </Link>
        ) : undefined
      }
      barre={<BandeJours jour={jour} auj={auj} base="/sport" marques={marques} />}
    >
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />

      {/* Semaine du programme */}
      {programme && pos && (
        <Link href="/sport/programme" className="mt-1 flex items-center gap-2 text-xs font-medium text-text-2">
          <span className="rounded-full bg-accent/20 px-2.5 py-1 text-accent">
            {pos.avant
              ? `Programme à partir du ${new Date(pos.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" })}`
              : pos.apres
                ? "Programme terminé"
                : `Semaine ${pos.semaine} / ${pos.total ?? "?"}`}
          </span>
          {!pos.avant && !pos.apres && (
            <span>
              Bloc {pos.bloc}
              {rythme?.objectif ? ` · ${LIBELLES.objectif[rythme.objectif] ?? rythme.objectif}` : ""}
            </span>
          )}
          <Icon name="chevron_right" size={16} className="ml-auto text-text-3" />
        </Link>
      )}

      {/* Hero */}
      <section className="mt-3">
        {seance ? (
          <HeroSeance
            seance={seance}
            kcalPrevues={kcalPrevues(seance, poids)}
            estAujourdhui={jour === auj}
            semaineNo={pos && !pos.avant && !pos.apres ? pos.semaine : null}
            totalSemaines={pos?.total ?? null}
          />
        ) : programme ? (
          <div className="rounded-lg border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-text-2">
              <Icon name="self_improvement" size={22} />
              <span className="text-sm font-medium">Repos</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Récupération active</p>
            <p className="mt-1 text-sm text-text-2">Marche, mobilité, sommeil. Les muscles se construisent aujourd’hui.</p>
            {prochaine && (
              <Link href={`/sport?jour=${prochaine.jour}`} className="mt-4 flex items-center justify-between rounded-md bg-surface-3 px-3 py-2.5 text-sm">
                <span>
                  Prochaine : <strong>{prochaine.titre}</strong> ·{" "}
                  {new Date(prochaine.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                </span>
                <Icon name="chevron_right" size={18} className="text-text-3" />
              </Link>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border p-5">
            <p className="text-2xl font-semibold tracking-tight">Pas encore de programme</p>
            <p className="mt-1 text-sm text-text-2">Règle ton rythme, ton matériel et ton objectif ; l’agent génère 12 semaines en blocs de 4.</p>
            <Link href="/reglages/sport" className="tap mt-4 flex items-center justify-center gap-2 rounded-full bg-accent px-5 font-semibold text-white">
              <Icon name="auto_awesome" size={20} /> Générer mon programme
            </Link>
          </div>
        )}
      </section>

      {/* Points d'entrée */}
      <section className="mt-5 grid grid-cols-2 gap-3">
        <EntreeCarte
          href="/sport/programme"
          icone="calendar_view_week"
          titre="Programme"
          detail={programme && pos && !pos.avant && !pos.apres ? `Semaine ${pos.semaine} / ${pos.total ?? "?"}` : programme ? programme.nom : "Aucun programme"}
          sous={programme ? `${rythme?.salle ?? 0} salle · ${rythme?.boxe ?? 0} boxe / sem.` : "À générer"}
        />
        <EntreeCarte
          href="/sport/historique"
          icone="history"
          titre="Historique"
          detail={`${(faitesMois ?? []).length} séance${(faitesMois ?? []).length > 1 ? "s" : ""}`}
          sous={`${kcalMois.toLocaleString("fr-FR")} kcal en ${moisLabel}`}
        />
        <EntreeCarte href="/sport/exercices" icone="play_circle" titre="Exercices" detail={`${nbExos ?? 317} vidéos`} sous="Technique, consignes, erreurs" />
        <EntreeCarte
          href={`/nutrition?jour=${jour}`}
          icone="local_fire_department"
          titre="Nutrition"
          module="nutrition"
          detail={`${bilan.brule > 0 ? "+" : ""}${bilan.brule} kcal`}
          sous={`Cible du jour ${bilan.cible.toLocaleString("fr-FR")} kcal`}
        />
      </section>
      <Link href="/reglages/sport" className="tap mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 text-sm">
        <span className="flex items-center gap-2 text-text-2">
          <Icon name="tune" size={20} /> Paramètres du programme
        </span>
        <span className="text-text-3">
          {params.duree_min} min · {LIBELLES.objectif[params.objectif] ?? params.objectif}
        </span>
      </Link>
    </ModuleFrame>
  );
}
