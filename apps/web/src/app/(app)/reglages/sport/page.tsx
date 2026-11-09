import Link from "next/link";
import { parametresSport, poidsActuel } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";
import { FormulaireSport } from "./FormulaireSport";

/** Admin du programme : tout ce que le générateur lit est modifiable ici, puis « Générer ». */
export default async function Page() {
  const { supabase, user } = await session();
  const params = await parametresSport(supabase, user.id);
  const [{ poids, source }, { data: prog }, { data: materiels }] = await Promise.all([
    poidsActuel(supabase, user.id, params),
    supabase.from("programmes").select("id, nom, debut, fin").eq("actif", true).maybeSingle(),
    supabase.from("exercices_ref").select("equipement").not("equipement", "is", null),
  ]);
  const compteMateriel = new Map<string, number>();
  for (const m of materiels ?? []) compteMateriel.set(m.equipement!, (compteMateriel.get(m.equipement!) ?? 0) + 1);

  return (
    <ModuleFrame
      module="reglages"
      titre="Programme sportif"
      sousTitre="Ce que l’agent utilise pour générer tes séances"
      gauche={
        <Link href="/reglages" className="tap flex w-10 items-center justify-center rounded-full" aria-label="Retour">
          <Icon name="arrow_back" size={24} />
        </Link>
      }
    >
      <Link
        href="/sport/programme/nouveau"
        className="tap mt-2 flex items-center justify-between rounded-lg bg-surface-brand-subtle px-4 text-sm font-medium"
        data-module="sport"
      >
        <span className="flex items-center gap-2">
          <Icon name="bolt" size={20} filled className="text-fg-brand" /> Créer un programme pas à pas
        </span>
        <Icon name="chevron_right" size={18} className="text-fg-tertiary" />
      </Link>
      <FormulaireSport
        initial={params}
        poids={{ valeur: poids, source }}
        programme={prog ? { nom: prog.nom, debut: prog.debut, fin: prog.fin } : null}
        materiels={[...compteMateriel.entries()].sort((a, b) => b[1] - a[1])}
      />
    </ModuleFrame>
  );
}
