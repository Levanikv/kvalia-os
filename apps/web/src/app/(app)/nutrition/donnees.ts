import type { AlimentSortie, Database, Repas } from "@kvalia/core";
import type { SupabaseClient } from "@supabase/supabase-js";

type Db = SupabaseClient<Database>;

/** Aliments récents : les derniers notés au journal, sans doublon — pour un ajout en deux gestes. Lecture d'affichage pure. */
export async function alimentsRecents(db: Db, max = 8): Promise<AlimentSortie[]> {
  const { data: lignes } = await db
    .from("journal_repas")
    .select("aliment_id, created_at")
    .not("aliment_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(40);
  const ids = [...new Set((lignes ?? []).map((r) => r.aliment_id as string))].slice(0, max);
  if (!ids.length) return [];
  const { data } = await db.from("aliments").select("id, nom, marque, source, kcal, prot, gluc, lip, fibres, portion_g, portion_nom, nutriscore").in("id", ids);
  return ids
    .map((id) => (data ?? []).find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a)
    .map((a) => ({ ...a, kcal: Number(a.kcal), prot: Number(a.prot), gluc: Number(a.gluc), lip: Number(a.lip) })) as AlimentSortie[];
}

/** Illustration d'un repas (tuiles, recettes) : un pictogramme que l'iPhone dessine en couleur. */
export const ILLUSTRATIONS_REPAS: Record<Repas, string> = {
  petit_dej: "🥐",
  collation: "🍎",
  dejeuner: "🥗",
  encas: "🥜",
  diner: "🍲",
};

/** Illustration d'une recette d'après son nom (l'ingrédient qui la résume), sinon celle de son repas. Présentation pure. */
const ILLUSTRATIONS_RECETTES: Array<[RegExp, string]> = [
  [/pancake|crêpe|gaufre/i, "🥞"],
  [/smoothie|shake|milk-?shake/i, "🥤"],
  [/porridge|avoine|granola|muesli|bircher/i, "🥣"],
  [/skyr|yaourt|fromage blanc|cottage/i, "🥛"],
  [/omelette|œuf|oeuf/i, "🍳"],
  [/tartine|toast|sandwich|bagel|croque/i, "🥪"],
  [/wrap|tortilla|burrito|fajita/i, "🌯"],
  [/pâtes|spaghetti|penne|lasagne|nouilles/i, "🍝"],
  [/saumon|cabillaud|thon|poisson|colin|crevette|sardine/i, "🐟"],
  [/poulet|dinde|volaille/i, "🍗"],
  [/bœuf|boeuf|steak|haché/i, "🥩"],
  [/soupe|velouté|curry|dahl|chili/i, "🍲"],
  [/riz|risotto|quinoa|bowl|poke/i, "🍚"],
  [/salade/i, "🥗"],
  [/banane/i, "🍌"],
  [/amande|noix|cacahu/i, "🥜"],
  [/pomme|fruit|compote/i, "🍎"],
];
export function illustrationRecette(nom: string, repas: readonly string[]): string {
  const trouve = ILLUSTRATIONS_RECETTES.find(([motif]) => motif.test(nom));
  if (trouve) return trouve[1];
  const premier = repas[0] as Repas | undefined;
  return (premier && ILLUSTRATIONS_REPAS[premier]) || "🍽️";
}

/** Lien vers la page « Ajouter à un repas ». */
export function lienAjout(repas: Repas, jour: string, aujourdhui: string): string {
  return `/nutrition/ajouter?repas=${repas}${jour === aujourdhui ? "" : `&jour=${jour}`}`;
}
