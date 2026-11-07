import Link from "next/link";
import { bilanJour } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { Placeholder } from "@/components/Placeholder";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { Segmented } from "@/components/Segmented";
import { aujourdhui, session } from "@/lib/session";
import { EntreeCarte } from "../sport/EntreeCarte";

/** Nutrition v1 : le bilan énergétique du jour, relié au sport (kcal brûlées → cible ajustée). Journal et plan repas en phase 2. */
export default async function Page() {
  const { supabase, user } = await session();
  const jour = aujourdhui();
  const b = await bilanJour(supabase, user.id, jour);
  const pct = b.cible > 0 ? Math.min(100, Math.round((b.consomme / b.cible) * 100)) : 0;
  const date = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

  return (
    <ModuleFrame module="nutrition" titre="Nutrition" sousTitre={date.charAt(0).toUpperCase() + date.slice(1)}
      barre={<Segmented items={[{ href: "/sport", label: "Sport" }, { href: "/nutrition", label: "Nutrition" }]} />}>
      <RealtimeRefresh tables={["seances", "journal_repas"]} />

      {/* Anneau / bilan */}
      <section className="mt-2 rounded-lg border border-border bg-surface-2 p-5">
        <div className="flex items-center gap-5">
          <div className="relative h-28 w-28 shrink-0">
            <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--surface-3)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--module-accent)" strokeWidth="3" strokeLinecap="round" strokeDasharray={`${pct * 0.974} 100`} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tracking-tight">{b.reste.toLocaleString("fr-FR")}</span>
              <span className="text-[10px] uppercase tracking-wide text-text-3">kcal restantes</span>
            </div>
          </div>
          <dl className="flex-1 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-text-2">Base</dt><dd className="font-medium">{b.base.toLocaleString("fr-FR")}</dd></div>
            <div className="flex justify-between"><dt className="flex items-center gap-1 text-text-2"><Icon name="local_fire_department" size={16} className="text-[#e5484d]" /> Sport</dt><dd className="font-medium text-success">+{b.brule}</dd></div>
            <div className="flex justify-between border-t border-border pt-2"><dt className="font-medium">Cible du jour</dt><dd className="font-semibold">{b.cible.toLocaleString("fr-FR")}</dd></div>
            <div className="flex justify-between"><dt className="text-text-2">Consommé</dt><dd className="font-medium">{b.consomme.toLocaleString("fr-FR")}</dd></div>
          </dl>
        </div>
        {b.seances.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-border pt-3 text-xs text-text-2">
            {b.seances.map((s) => (
              <li key={s.id} className="flex items-center justify-between">
                <Link href={`/sport/seance/${s.id}`} className="flex items-center gap-1.5"><Icon name="fitness_center" size={16} /> {s.titre ?? s.type} · {s.etat === "faite" ? "terminée" : s.etat === "en_cours" ? "en cours" : "prévue"}</Link>
                <span>{s.kcal > 0 ? `+${s.kcal} kcal` : "—"}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex items-center justify-between text-xs text-text-3">
          <span>Protéines : {b.proteines} / {b.proteines_cible} g</span>
          <Link href="/reglages/nutrition" className="flex items-center gap-1 text-accent">Régler <Icon name="chevron_right" size={14} /></Link>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <EntreeCarte href="/nutrition/plan" icone="calendar_month" titre="Plan repas" detail="Phase 2" sous="Semaine générée, batch cooking" />
        <EntreeCarte href="/nutrition/recettes" icone="menu_book" titre="Recettes" detail="Phase 2" sous="Macros, portions, ingrédients" />
        <EntreeCarte href="/quotidien/courses" icone="shopping_cart" titre="Courses" module="quotidien" detail="Liste active" sous="Depuis le plan repas" />
        <EntreeCarte href="/sport" icone="fitness_center" titre="Sport" module="sport" detail={`${b.brule} kcal`} sous="Brûlées aujourd’hui" />
      </section>

      <Placeholder phase="2" ecran="Journal du jour" points={["Repas pré-remplis depuis le plan : un tap = pris", "Ajout libre par phrase (« 2 œufs et du skyr »)", "Pesée du matin → poids utilisé pour les kcal sport"]} />
    </ModuleFrame>
  );
}
