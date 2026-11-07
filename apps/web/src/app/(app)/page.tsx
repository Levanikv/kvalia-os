import type { VueJour } from "@kvalia/core";
import { Carte } from "@/components/Carte";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";


/** Home v0 : la vue Jour (fonction SQL vue_jour) en widgets. Ordre fixe ; le réordonnancement arrive en phase 1. */
export default async function Home() {
  const { supabase } = await session();
  const jour = aujourdhui();
  const { data, error } = await supabase.rpc("vue_jour", { p_jour: jour });
  const vue = (error ? null : (data as unknown as VueJour)) ?? null;

  const date = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const tachesDues = vue?.taches ?? [];
  const habitudesFaites = vue?.habitudes.filter((h) => h.fait).length ?? 0;

  return (
    <ModuleFrame module="home" titre="Aujourd’hui" sousTitre={date.charAt(0).toUpperCase() + date.slice(1)}>
      <RealtimeRefresh tables={["lignes", "taches", "habitudes_log", "seances", "exercices_seance"]} />
      <div className="grid gap-3 pt-2 lg:grid-cols-2">
        <Carte titre="Aujourd’hui" icone="today" href="/quotidien/taches" module="home">
          {vue && (vue.evenements.length > 0 || tachesDues.length > 0) ? (
            <ul className="space-y-1.5 text-sm">
              {vue.evenements.map((e) => (
                <li key={e.id} className="flex items-center gap-2">
                  <span className="w-12 shrink-0 text-xs text-text-2">{new Date(e.debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="truncate">{e.titre}</span>
                </li>
              ))}
              {tachesDues.slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <Icon name="radio_button_unchecked" size={16} className="shrink-0 text-text-3" />
                  <span className="truncate">{t.titre}</span>
                  {t.priorite === "haute" && <Icon name="priority_high" size={16} className="text-danger" />}
                </li>
              ))}
              {tachesDues.length > 4 && <li className="text-xs text-text-3">+ {tachesDues.length - 4} autres</li>}
            </ul>
          ) : (
            <p className="text-sm text-text-3">Rien de prévu. L’agenda Google arrive en phase 1.</p>
          )}
        </Carte>

        <Carte titre="Courses" icone="shopping_cart" href="/quotidien/courses" module="quotidien">
          {vue?.courses ? (
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-semibold tracking-tight">{vue.courses.articles}</span>
              <span className="text-sm text-text-2">articles à prendre</span>
              {vue.courses.manques > 0 && (
                <span className="ml-auto rounded-full bg-danger/15 px-2 py-0.5 text-xs font-medium text-danger">{vue.courses.manques} manque{vue.courses.manques > 1 ? "s" : ""}</span>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-3">Pas de liste active.</p>
          )}
        </Carte>

        <Carte titre="Habitudes" icone="repeat" href="/quotidien/habitudes" module="quotidien">
          {vue && vue.habitudes.length > 0 ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-semibold tracking-tight">{habitudesFaites}<span className="text-base text-text-2"> / {vue.habitudes.length}</span></span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                <div className="h-full bg-accent" style={{ width: `${(habitudesFaites / vue.habitudes.length) * 100}%` }} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-3">Aucune habitude pour l’instant.</p>
          )}
        </Carte>

        <Carte titre="Séance du jour" icone="fitness_center" href={vue?.seance ? `/sport/seance/${vue.seance.id}` : "/sport"} module="sport">
          {vue?.seance ? (
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="truncate text-lg font-semibold tracking-tight">{vue.seance.titre ?? vue.seance.type}</p>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${vue.seance.etat === "faite" ? "bg-success/15 text-success" : vue.seance.etat === "en_cours" ? "bg-accent/15 text-accent" : "bg-surface-3 text-text-2"}`}>
                  {vue.seance.etat === "faite" ? `✓ ${vue.seance.kcal ?? 0} kcal` : vue.seance.etat === "en_cours" ? `${vue.seance.nb_faits ?? 0}/${vue.seance.nb_exercices}` : "Prévue"}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-text-2">
                {vue.seance.nb_exercices > 0 ? `${vue.seance.nb_exercices} exercices` : "Séance libre"}{vue.seance.duree_min ? ` · ${vue.seance.duree_min} min` : ""}
                {vue.seance.etat !== "faite" && <span className="text-accent"> · Démarrer →</span>}
              </p>
            </div>
          ) : (
            <p className="text-sm text-text-3">Repos aujourd’hui — ou pas encore de programme.</p>
          )}
        </Carte>

        <Carte titre="Repas" icone="restaurant" href="/nutrition" module="nutrition">
          {vue && vue.repas.length > 0 ? (
            <ul className="text-sm">{vue.repas.map((r) => <li key={r.repas + r.recette_id}>{r.repas} · {r.recette}</li>)}</ul>
          ) : (
            <p className="text-sm text-text-3">Plan repas en phase 2.</p>
          )}
        </Carte>

        <Carte titre="Finances" icone="account_balance_wallet" href="/finances" module="finances">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold tracking-tight">{Math.round(vue?.depenses_semaine ?? 0)} €</span>
            <span className="text-sm text-text-2">cette semaine</span>
          </div>
        </Carte>

        <Carte titre="Objectifs" icone="flag" href="/objectifs" module="objectifs">
          {vue && vue.objectifs.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {vue.objectifs.map((o) => (
                <li key={o.id}>
                  <div className="flex justify-between"><span className="truncate">{o.titre}</span><span className="text-text-2">{o.valeur}{o.cible ? ` / ${o.cible}` : ""}</span></div>
                  {o.cible ? <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3"><div className="h-full bg-accent" style={{ width: `${Math.min(100, (o.valeur / o.cible) * 100)}%` }} /></div> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-3">Aucun objectif.</p>
          )}
        </Carte>

        <Carte titre="Alertes" icone="notifications" href="/documents" module="documents">
          {vue && vue.alertes.length > 0 ? (
            <ul className="text-sm">{vue.alertes.map((a) => <li key={a.document_id}>{a.titre} · expire le {new Date(a.expiration).toLocaleDateString("fr-FR")}</li>)}</ul>
          ) : (
            <p className="text-sm text-text-3">Rien n’expire dans les 30 jours.</p>
          )}
        </Carte>
      </div>
      {error && <p className="mt-4 text-xs text-danger">vue_jour : {error.message}</p>}
    </ModuleFrame>
  );
}
