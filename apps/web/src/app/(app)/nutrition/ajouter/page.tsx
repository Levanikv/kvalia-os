import Link from "next/link";
import { derniersRepas, journalDuJour, LIBELLES_REPAS, listerRecettes, REPAS, Repas, repasDuMoment, suggererRepas } from "@kvalia/core";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { aujourdhui, session } from "@/lib/session";
import { dateLongue, jourDepuis, jourRelatif } from "../../sport/lib";
import { alimentsRecents, lienAjout } from "../donnees";
import { AjouterRepas } from "./AjouterRepas";
import { ChoixRepas } from "./ChoixRepas";

type Props = { searchParams: Promise<{ repas?: string; jour?: string }> };

/**
 * « Ajouter à un repas » (plein écran, ouvert par le « + » d'un repas ou celui de la barre) : on choisit le repas,
 * puis d'où vient ce qu'on mange — **Pour toi** (les recettes que l'app propose selon les calories et les protéines
 * qu'il reste, et la séance du jour), **Recettes** (toutes celles du repas, les siennes d'abord) ou **Aliments**
 * (recherche, scan, photo, saisie rapide, récents). Un jour futur est ramené à aujourd'hui : on ne note pas d'avance.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const demande = jourDepuis(sp.jour, auj);
  const jour = demande > auj ? auj : demande;
  const choix = Repas.safeParse(sp.repas);
  const repas = choix.success ? choix.data : repasDuMoment();

  const [journal, suggestion, recettes, recents, precedents] = await Promise.all([
    journalDuJour(supabase, user.id, jour),
    suggererRepas(supabase, user.id, { jour, repas }),
    listerRecettes(supabase, user.id),
    alimentsRecents(supabase),
    derniersRepas(supabase, user.id, jour),
  ]);
  const dejaNote = journal.repas.find((r) => r.repas === repas);
  const retour = jour === auj ? "/nutrition" : `/nutrition?jour=${jour}`;
  const petit = repas === "collation" || repas === "encas";

  return (
    <ModuleFrame
      module="nutrition"
      titre="Ajouter à un repas"
      sousTitre={jour === auj ? jourRelatif(jour, auj) : dateLongue(jour)}
      gauche={
        <Link href={retour} className="kv-iconbtn" aria-label="Fermer">
          <Icon name="close" size={24} />
        </Link>
      }
      action={<span className="w-10" aria-hidden />}
    >
      <div className="flex flex-col gap-[var(--stack-lg)]">
        <ChoixRepas repas={repas} liens={REPAS.map((r) => ({ repas: r, href: lienAjout(r, jour, auj), label: LIBELLES_REPAS[r] }))} />

        <AjouterRepas
          key={repas}
          jour={jour}
          retour={retour}
          repas={repas}
          libelle={LIBELLES_REPAS[repas]}
          dejaKcal={dejaNote?.kcal ?? 0}
          message={suggestion.message}
          budget={suggestion.budget_kcal}
          suggestions={suggestion.suggestions}
          recettes={recettes.filter((r) => r.repas.includes(repas) || (petit && (r.repas.includes("collation") || r.repas.includes("encas"))))}
          recents={recents}
          precedent={dejaNote?.lignes.length ? undefined : precedents[repas]}
        />
      </div>
    </ModuleFrame>
  );
}
