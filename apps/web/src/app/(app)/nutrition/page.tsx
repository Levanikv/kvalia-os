import { derniersRepas, journalDuJour, parcoursRepas, repasDuMoment, suggererRepas, type AlimentSortie } from "@kvalia/core";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { enteteJour } from "../sport/entete";
import { jourDepuis } from "../sport/lib";
import { BoutonAjout, FournisseurAjout } from "./Ajout";
import { Bilan } from "./Bilan";
import { RepasDuJour } from "./Repas";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Nutrition — accueil du jour (même en-tête que Sport : pastille du jour, semaine, bande de jours) :
 * le bilan à même le fond (`Bilan` : calories restantes, anneau par macro, trois jauges fines), les repas en une
 * seule liste (`RepasDuJour` : un seul déplié, celui du moment, avec le chemin le plus court pour le noter), puis le
 * lien vers les recettes. La barre d'action fixe ajoute au repas du moment, ou ouvre le scan ou l'appareil photo.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const moment = repasDuMoment();
  const [j, entete, suggestion, precedents, { data: recentsBruts }] = await Promise.all([
    journalDuJour(supabase, user.id, jour),
    enteteJour(supabase, jour, auj, "/nutrition"),
    suggererRepas(supabase, user.id, { jour, repas: moment }),
    derniersRepas(supabase, user.id, jour),
    supabase.from("journal_repas").select("aliment_id, created_at").not("aliment_id", "is", null).order("created_at", { ascending: false }).limit(40),
  ]);
  // Aliments récents : les derniers utilisés, sans doublon, pour un ajout en deux gestes.
  const idsRecents = [...new Set((recentsBruts ?? []).map((r) => r.aliment_id as string))].slice(0, 8);
  const { data: alimentsRecents } = idsRecents.length
    ? await supabase.from("aliments").select("id, nom, marque, source, kcal, prot, gluc, lip, fibres, portion_g, portion_nom, nutriscore").in("id", idsRecents)
    : { data: [] };
  const recents = idsRecents
    .map((id) => (alimentsRecents ?? []).find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ ...a, kcal: Number(a.kcal), prot: Number(a.prot), gluc: Number(a.gluc), lip: Number(a.lip) })) as AlimentSortie[];

  const modifiable = jour <= auj;
  const estAujourdhui = jour === auj;
  const parcours = parcoursRepas(j, estAujourdhui ? moment : null);
  const cartes = j.repas.map((r, i) => ({
    ...r,
    etat: parcours.repas[i].etat,
    conseille_kcal: parcours.repas[i].conseille_kcal,
    precedent: precedents[r.repas],
  }));
  const titreDate = new Date(jour + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const macros = [
    { nom: "Protéines", valeur: j.proteines, cible: j.macros_cible.prot, couleur: "var(--nutrition-data-protein)", kcalParG: 4 },
    { nom: "Glucides", valeur: j.glucides, cible: j.macros_cible.gluc, couleur: "var(--nutrition-data-carbs)", kcalParG: 4 },
    { nom: "Lipides", valeur: j.lipides, cible: j.macros_cible.lip, couleur: "var(--nutrition-data-fat)", kcalParG: 9 },
  ];

  return (
    <FournisseurAjout jour={jour} repasDuMoment={moment} recents={recents}>
      <ModuleFrame
        module="nutrition"
        surTitre="Nutrition"
        titre={titreDate.charAt(0).toUpperCase() + titreDate.slice(1)}
        action={entete.action}
        barre={entete.barre}
        pied={modifiable ? <BoutonAjout /> : undefined}
      >
        <RealtimeRefresh tables={["seances", "journal_repas"]} />
        <div className="cascade flex flex-col gap-[var(--stack-xl)]">
          <Bilan cible={j.cible} brule={j.brule} consomme={j.consomme} reste={j.reste} macros={macros} />

          <RepasDuJour
            key={jour}
            jour={jour}
            consomme={j.consomme}
            modifiable={modifiable}
            repas={cartes}
            focus={parcours.focus}
            ideesFocus={estAujourdhui ? { message: suggestion.message, suggestions: suggestion.suggestions } : null}
          />

          <Link
            href="/nutrition/recettes"
            className="tap flex items-center justify-between rounded-[var(--radius-card)] border border-line-subtle bg-surface-container-default px-[var(--inset-md)] py-[var(--inset-sm)]"
          >
            <span className="flex items-center gap-[var(--inline-md)] type-title-sm">
              <Icon name="menu_book" size={22} className="text-fg-brand" /> Recettes
            </span>
            <Icon name="chevron_right" size={20} className="text-icon-tertiary" />
          </Link>
        </div>
      </ModuleFrame>
    </FournisseurAjout>
  );
}
