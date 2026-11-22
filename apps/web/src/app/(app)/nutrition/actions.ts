"use server";
import { revalidatePath } from "next/cache";
import { EntreeJournal, executer, Repas } from "@kvalia/core";
import { session } from "@/lib/session";

/** Toutes les actions passent par `executer` : même règle que l'agent (packages/core). */

/** En production, Next masque le message d'une erreur levée dans une server action : on le renvoie explicitement. */
type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };
async function tenter<T>(f: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, valeur: await f() };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Action impossible." };
  }
}

function revalider() {
  revalidatePath("/nutrition");
  revalidatePath("/sport");
  revalidatePath("/");
}

/** Recherche d'aliments : la base seule (`distant: false`, rapide) ou avec Open Food Facts (produits de marque). */
export async function chercherAlimentAction(requete: string, distant: boolean) {
  const { supabase, user } = await session();
  return tenter(() => executer("chercher_aliment", { requete: requete.trim().slice(0, 80), distant }, { db: supabase, userId: user.id }));
}

export async function ajouterAuJournalAction(brut: unknown) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("ajouter_au_journal", EntreeJournal.parse(brut), { db: supabase, userId: user.id });
    revalider();
    return r;
  });
}

export async function supprimerDuJournalAction(id: string) {
  const { supabase, user } = await session();
  return tenter(async () => {
    const r = await executer("supprimer_du_journal", { id }, { db: supabase, userId: user.id });
    revalider();
    return r;
  });
}

/** Suggestions pour un autre repas que celui du moment (puces de la carte « À manger maintenant »). */
export async function suggererAction(jour: string, repas: string) {
  const { supabase, user } = await session();
  return tenter(() => executer("suggerer_repas", { jour, repas: Repas.parse(repas) }, { db: supabase, userId: user.id }));
}
