import { derniersRepas, journalDuJour, parcoursRepas, repasDuMoment, suggererRepas } from "@kvalia/core";
import { ModuleFrame } from "@/components/ModuleFrame";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { enteteJour } from "../sport/entete";
import { jourDepuis } from "../sport/lib";
import { Bilan } from "./Bilan";
import { RepasDuJour } from "./Repas";

type Props = { searchParams: Promise<{ jour?: string }> };

/**
 * Nutrition — accueil du jour (même en-tête que Sport : sélecteur, date, bande de jours). Deux blocs, pas plus :
 * le bilan (`Bilan` : ce qu'il reste, mangées, brûlées, macros) et les repas en tuiles (`RepasDuJour` : celui du
 * moment en tête avec la meilleure idée, les autres sur deux colonnes). Les recettes sont dans la barre du bas ;
 * le « + » de la barre déploie la photo, le scan et l'ajout à un repas.
 */
export default async function Page({ searchParams }: Props) {
  const { supabase, user } = await session();
  const sp = await searchParams;
  const auj = aujourdhui();
  const jour = jourDepuis(sp.jour, auj);
  const moment = repasDuMoment();
  const estAujourdhui = jour === auj;
  const [j, entete, suggestion, precedents] = await Promise.all([
    journalDuJour(supabase, user.id, jour),
    enteteJour(supabase, jour, auj, "/nutrition"),
    estAujourdhui ? suggererRepas(supabase, user.id, { jour, repas: moment }) : null,
    derniersRepas(supabase, user.id, jour),
  ]);

  const parcours = parcoursRepas(j, estAujourdhui ? moment : null);
  const cartes = j.repas.map((r, i) => ({
    ...r,
    etat: parcours.repas[i].etat,
    conseille_kcal: parcours.repas[i].conseille_kcal,
    precedent: precedents[r.repas],
  }));
  const macros = [
    { nom: "Protéines", valeur: j.proteines, cible: j.macros_cible.prot, couleur: "var(--nutrition-data-protein)", kcalParG: 4 },
    { nom: "Glucides", valeur: j.glucides, cible: j.macros_cible.gluc, couleur: "var(--nutrition-data-carbs)", kcalParG: 4 },
    { nom: "Lipides", valeur: j.lipides, cible: j.macros_cible.lip, couleur: "var(--nutrition-data-fat)", kcalParG: 9 },
  ];

  return (
    <ModuleFrame
      module="nutrition"
      surTitre={entete.surTitre}
      titre={entete.titre}
      action={entete.action}
      barre={entete.barre}
      jour={estAujourdhui ? undefined : jour}
    >
      <RealtimeRefresh tables={["seances", "journal_repas"]} />
      <div className="cascade flex flex-col gap-[var(--stack-xl)]">
        <Bilan cible={j.cible} brule={j.brule} consomme={j.consomme} reste={j.reste} macros={macros} />
        <RepasDuJour key={jour} jour={jour} aujourdhui={auj} modifiable={jour <= auj} repas={cartes} idee={suggestion?.suggestions[0] ?? null} />
      </div>
    </ModuleFrame>
  );
}
