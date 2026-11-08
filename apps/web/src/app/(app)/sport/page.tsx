import Link from "next/link";
import { bilanJour, LIBELLES, parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { EntreeCarte } from "./EntreeCarte";
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

  return (
    <ModuleFrame module="sport" titre="Sport" sousTitre={entete.sousTitre} action={entete.action} barre={entete.barre}>
      <RealtimeRefresh tables={["seances", "exercices_seance"]} />

      {/* Programme suivi */}
      {programme && pos && (
        <Link
          href="/sport/programme"
          className="relative mt-1 block overflow-hidden rounded-lg border border-line-default bg-surface-default px-4 py-3 active:opacity-90"
        >
          <div className="absolute inset-y-0 left-0 w-1 bg-action-primary" aria-hidden />
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">Programme suivi</p>
              <p className="truncate text-sm font-semibold">{programme.nom}</p>
              <p className="truncate text-xs text-fg-secondary">
                {pos.avant
                  ? `Commence le ${new Date(pos.debut + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" })}`
                  : pos.apres
                    ? "Programme terminé — génère le suivant"
                    : [`Bloc ${pos.bloc}`, libelleFocus(focusJour), rythme?.niveau ? LIBELLES.niveau[rythme.niveau] : null].filter(Boolean).join(" · ")}
              </p>
            </div>
            {dansProgramme && (
              <div className="shrink-0 text-right">
                <p className="text-2xl font-semibold leading-none tracking-tight">
                  S{pos.semaine}
                  <span className="text-sm font-normal text-fg-tertiary">/{pos.total ?? "?"}</span>
                </p>
              </div>
            )}
            <Icon name="chevron_right" size={18} className="shrink-0 text-fg-tertiary" />
          </div>
          {dansProgramme && pos.total && (
            <div className="mt-2.5 flex gap-0.5" aria-hidden>
              {Array.from({ length: pos.total }, (_, i) => (
                <span
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i + 1 < pos.semaine ? "bg-action-primary" : i + 1 === pos.semaine ? "bg-action-primary/60" : "bg-surface-sunken"}`}
                />
              ))}
            </div>
          )}
        </Link>
      )}

      {/* Séance(s) du jour */}
      <section className="mt-4">
        {seances.length > 1 && (
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Double séance</h2>
            <p className="text-xs text-fg-secondary">{seances.map((s) => (s.type === "boxe" ? "Boxe" : "Muscu")).join(" + ")}</p>
          </div>
        )}
        <div className="space-y-3">
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
        </div>

        {seances.length === 0 &&
          (programme ? (
            <div className="rounded-lg border border-line-default bg-surface-default p-5">
              <div className="flex items-center gap-2 text-fg-secondary">
                <Icon name="self_improvement" size={22} />
                <span className="text-sm font-medium">Repos</span>
              </div>
              <p className="mt-2 text-2xl font-semibold tracking-tight">Récupération active</p>
              <p className="mt-1 text-sm text-fg-secondary">Marche, mobilité, sommeil. Les muscles se construisent aujourd’hui.</p>
              {prochaine && (
                <Link
                  href={`/sport?jour=${prochaine.jour}`}
                  className="mt-4 flex items-center justify-between rounded-md bg-surface-sunken px-3 py-2.5 text-sm"
                >
                  <span>
                    Prochaine : <strong>{prochaine.titre}</strong> ·{" "}
                    {new Date(prochaine.jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric" })}
                  </span>
                  <Icon name="chevron_right" size={18} className="text-fg-tertiary" />
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line-default p-5">
              <p className="text-2xl font-semibold tracking-tight">Pas encore de programme</p>
              <p className="mt-1 text-sm text-fg-secondary">Objectif, rythme, matériel : l’agent construit tes semaines en blocs de 4.</p>
              <Link
                href="/sport/programme/nouveau"
                className="tap mt-4 flex items-center justify-center gap-2 rounded-full bg-action-primary px-5 font-semibold text-fg-on-brand"
              >
                <Icon name="auto_awesome" size={20} /> Créer mon programme
              </Link>
            </div>
          ))}
      </section>

      {/* La semaine */}
      {semaineSeances.length > 0 && (
        <section className="mt-5 rounded-lg border border-line-default bg-surface-default p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold">{dansProgramme ? `Semaine ${pos.semaine}` : "Cette semaine"}</h2>
            <p className="text-xs text-fg-secondary">
              {faitesSemaine.length}/{semaineSeances.length} séances · {kcalSemaine.toLocaleString("fr-FR")} kcal
            </p>
          </div>
          <ol className="mt-3 grid grid-cols-7 gap-1">
            {JOURS_COURTS.map((l, i) => {
              const j = decaler(lundi, i);
              const ss = semaineSeances.filter((s) => s.jour === j).sort((a, b) => (a.type === "boxe" ? 1 : 0) - (b.type === "boxe" ? 1 : 0));
              const actif = j === jour;
              return (
                <li key={j}>
                  <Link
                    href={`/sport?jour=${j}`}
                    scroll={false}
                    aria-current={actif ? "date" : undefined}
                    className={`flex min-h-16 flex-col items-center gap-1 rounded-md py-1.5 ${actif ? "bg-surface-brand-subtle ring-1 ring-action-primary/50" : ""}`}
                  >
                    <span className={`text-[10px] font-medium ${j === auj ? "text-fg-brand" : "text-fg-tertiary"}`}>{l}</span>
                    {ss.length === 0 ? (
                      <span className="mt-1 h-1 w-1 rounded-full bg-surface-sunken" />
                    ) : (
                      ss.map((s) => (
                        <Icon
                          key={s.id}
                          name={s.etat === "faite" ? "check_circle" : s.type === "boxe" ? "sports_mma" : "fitness_center"}
                          size={16}
                          filled={s.etat === "faite"}
                          className={s.etat === "faite" ? "text-feedback-success-text" : s.type === "boxe" ? "text-[#f0872b]" : "text-fg-brand"}
                        />
                      ))
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Historique et énergie */}
      <section className="mt-3 grid grid-cols-2 gap-3">
        <EntreeCarte
          href="/sport/historique"
          icone="history"
          titre="Historique"
          detail={`${(faitesMois ?? []).length} séance${(faitesMois ?? []).length > 1 ? "s" : ""}`}
          sous={`${kcalMois.toLocaleString("fr-FR")} kcal en ${moisLabel}`}
        />
        <EntreeCarte
          href={`/nutrition?jour=${jour}`}
          icone="local_fire_department"
          titre="Énergie"
          module="nutrition"
          detail={`${bilan.cible.toLocaleString("fr-FR")} kcal`}
          sous={bilan.brule > 0 ? `Cible du jour, dont +${bilan.brule} sport` : "Cible du jour"}
        />
      </section>
      {seances.length > 0 && (
        <p className="mt-3 text-center text-xs text-fg-tertiary">
          {seances.map((s) => s.titre ?? libelleType(s.type)).join(" · ")} — {params.duree_min} min visées
        </p>
      )}
    </ModuleFrame>
  );
}
