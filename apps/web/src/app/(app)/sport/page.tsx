import Link from "next/link";
import { bilanJour, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Segmented } from "@/components/Segmented";
import { aujourdhui, session } from "@/lib/session";
import { EntreeCarte } from "./EntreeCarte";
import { HeroSeance } from "./HeroSeance";
import { decaler, dateLongue, kcalPrevues, seancePourJour, semaineDe } from "./lib";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Sport — vue Jour (défaut). Hero = la séance du jour ; dessous, les points d'entrée en cartes
 * (Programme, Historique, Exercices, Nutrition, Réglages) avec un détail rapide chacun.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = /^\d{4}-\d{2}-\d{2}$/.test(sp.jour ?? "") ? sp.jour! : auj;
  const semaine = semaineDe(jour);

  const [seance, params, { data: semaineSeances }, { data: programme }, { data: faitesMois }, { count: nbExos }] = await Promise.all([
    seancePourJour(supabase, jour),
    parametresSport(supabase, user.id),
    supabase.from("seances").select("id, jour, type, etat").gte("jour", semaine[0]).lte("jour", semaine[6]),
    supabase.from("programmes").select("id, nom, debut, fin, rythme").eq("actif", true).maybeSingle(),
    supabase.from("seances").select("kcal, duree_min").eq("etat", "faite").gte("jour", auj.slice(0, 8) + "01"),
    supabase.from("exercices_ref").select("id", { count: "exact", head: true }),
  ]);
  const [{ poids }, bilan] = await Promise.all([poidsActuel(supabase, user.id, params), bilanJour(supabase, user.id, auj)]);

  const prochaine = !seance || jour !== auj
    ? (await supabase.from("seances").select("id, jour, titre, type").gt("jour", jour).in("etat", ["prevue"]).order("jour").limit(1).maybeSingle()).data
    : null;

  const kcalMois = (faitesMois ?? []).reduce((a, s) => a + Number(s.kcal ?? 0), 0);
  const semaineNo = programme ? Math.floor((new Date(jour).getTime() - new Date(programme.debut).getTime()) / 604800000) + 1 : null;
  const totalSemaines = programme?.fin ? Math.round((new Date(programme.fin).getTime() - new Date(programme.debut).getTime() + 86400000) / 604800000) : null;
  const rythme = programme?.rythme as { salle?: number; boxe?: number } | null;

  return (
    <ModuleFrame module="sport" titre="Sport" sousTitre={dateLongue(jour)}
      action={jour !== auj ? <Link href="/sport" className="tap flex items-center rounded-full bg-surface-2 px-3 text-sm font-medium">Aujourd’hui</Link> : undefined}
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />

      {/* Bande semaine */}
      <nav aria-label="Semaine" className="-mx-1 mt-2 flex items-center justify-between">
        <Link href={`/sport?jour=${decaler(semaine[0], -7)}`} className="tap flex w-8 items-center justify-center text-text-3" aria-label="Semaine précédente"><Icon name="chevron_left" size={20} /></Link>
        <ul className="flex flex-1 justify-between">
          {semaine.map((j) => {
            const s = (semaineSeances ?? []).find((x) => x.jour === j);
            const actif = j === jour;
            const d = new Date(j + "T12:00:00");
            return (
              <li key={j}>
                <Link href={`/sport?jour=${j}`} className={`tap flex w-10 flex-col items-center justify-center gap-0.5 rounded-xl py-1 ${actif ? "bg-accent text-white" : ""}`}>
                  <span className={`text-[10px] uppercase ${actif ? "text-white/80" : "text-text-3"}`}>{d.toLocaleDateString("fr-FR", { weekday: "narrow" })}</span>
                  <span className={`text-sm font-semibold ${!actif && j === auj ? "text-accent" : ""}`}>{d.getDate()}</span>
                  <span className={`h-1.5 w-1.5 rounded-full ${s ? (s.etat === "faite" ? (actif ? "bg-white" : "bg-success") : s.type === "boxe" ? "bg-[#f0872b]" : actif ? "bg-white/70" : "bg-accent") : "bg-transparent"}`} />
                </Link>
              </li>
            );
          })}
        </ul>
        <Link href={`/sport?jour=${decaler(semaine[0], 7)}`} className="tap flex w-8 items-center justify-center text-text-3" aria-label="Semaine suivante"><Icon name="chevron_right" size={20} /></Link>
      </nav>

      {/* Hero */}
      <section className="mt-3">
        {seance ? (
          <HeroSeance seance={seance} kcalPrevues={kcalPrevues(seance, poids)} estAujourdhui={jour === auj} semaineNo={semaineNo} totalSemaines={totalSemaines} />
        ) : programme ? (
          <div className="rounded-lg border border-border bg-surface-2 p-5">
            <div className="flex items-center gap-2 text-text-2"><Icon name="self_improvement" size={22} /><span className="text-sm font-medium">Repos</span></div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">Récupération active</p>
            <p className="mt-1 text-sm text-text-2">Marche, mobilité, sommeil. Les muscles se construisent aujourd’hui.</p>
            {prochaine && (
              <Link href={`/sport?jour=${prochaine.jour}`} className="mt-4 flex items-center justify-between rounded-md bg-surface-3 px-3 py-2.5 text-sm">
                <span>Prochaine : <strong>{prochaine.titre}</strong> · {new Date(prochaine.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long" })}</span>
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
        <EntreeCarte href="/sport/programme" icone="calendar_view_week" titre="Programme"
          detail={programme ? `Semaine ${Math.min(Math.max(semaineNo ?? 1, 1), totalSemaines ?? 12)} / ${totalSemaines ?? "?"}` : "Aucun programme"}
          sous={programme ? `${rythme?.salle ?? 0} salle · ${rythme?.boxe ?? 0} boxe / sem.` : "À générer"} />
        <EntreeCarte href="/sport/historique" icone="history" titre="Historique"
          detail={`${(faitesMois ?? []).length} séance${(faitesMois ?? []).length > 1 ? "s" : ""}`}
          sous={`${kcalMois.toLocaleString("fr-FR")} kcal ce mois-ci`} />
        <EntreeCarte href="/sport/exercices" icone="play_circle" titre="Exercices"
          detail={`${nbExos ?? 317} vidéos`} sous="Technique, consignes, erreurs" />
        <EntreeCarte href="/nutrition" icone="local_fire_department" titre="Nutrition" module="nutrition"
          detail={`${bilan.brule > 0 ? "+" : ""}${bilan.brule} kcal`} sous={`Cible du jour ${bilan.cible.toLocaleString("fr-FR")} kcal`} />
      </section>
      <Link href="/reglages/sport" className="tap mt-3 flex items-center justify-between rounded-lg border border-border bg-surface-2 px-4 text-sm">
        <span className="flex items-center gap-2 text-text-2"><Icon name="tune" size={20} /> Paramètres du programme</span>
        <span className="text-text-3">{params.duree_min} min · {params.objectif.replace("_", " ")}</span>
      </Link>
    </ModuleFrame>
  );
}
