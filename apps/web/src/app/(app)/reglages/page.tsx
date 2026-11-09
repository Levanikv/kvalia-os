import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { deconnexion } from "./actions";

export const metadata: Metadata = { title: "Réglages" };

const ENTREES = [
  { href: "/reglages/sport", icone: "fitness_center", label: "Programme sportif", note: "rythme, matériel, objectif" },
  { href: "/reglages/nutrition", icone: "restaurant", label: "Nutrition", note: "cible kcal, protéines" },
  { href: "/reglages/widgets", icone: "dashboard_customize", label: "Widgets de la Home", note: "phase 1" },
  { href: "/reglages/modules", icone: "apps", label: "Modules & tab bar", note: "phase 1" },
  { href: "/reglages/agent", icone: "smart_toy", label: "Contexte de l’agent", note: "phase 4" },
  { href: "/reglages/journal", icone: "history", label: "Journal des appels d’outils", note: "" },
];

export default async function Reglages() {
  const { supabase, user } = await session();
  const { data: profil } = await supabase.from("profils").select("prenom").eq("id", user.id).maybeSingle();
  return (
    <ModuleFrame module="reglages">
      <div className="flex flex-col gap-5 pt-2">
        <section className="rounded-lg border border-line-default bg-surface-default p-4">
          <p className="text-base font-medium">{profil?.prenom ?? "Sans prénom"}</p>
          <p className="text-sm text-fg-secondary">{user.email}</p>
        </section>
        <ul className="overflow-hidden rounded-lg border border-line-default bg-surface-default">
          {ENTREES.map((e) => (
            <li key={e.href} className="border-b border-line-default last:border-b-0">
              <Link href={e.href} className="tap flex items-center gap-3 px-4 py-2.5 text-sm">
                <Icon name={e.icone} size={22} className="text-fg-brand" />
                <span className="flex-1">{e.label}</span>
                {e.note && <span className="text-xs text-fg-tertiary">{e.note}</span>}
                <Icon name="chevron_right" size={20} className="text-fg-tertiary" />
              </Link>
            </li>
          ))}
        </ul>
        <form action={deconnexion}>
          <button type="submit" className="tap w-full rounded-md border border-line-default text-sm font-medium text-feedback-danger-text">
            Se déconnecter
          </button>
        </form>
        <p className="text-center text-xs text-fg-tertiary">KVALIA OS · v0 · phase 0</p>
      </div>
    </ModuleFrame>
  );
}
