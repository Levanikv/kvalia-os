import type { SupabaseClient } from "@supabase/supabase-js";
import { SOURCE_EXERCICES, type Database } from "@kvalia/core";
import { aujourdhui } from "@/lib/session";
import { decaler, libellePartie, nomAffiche } from "../lib";

/** Référentiel pour le sélecteur d'exercices (bibliothèque en service, noms d'usage en anglais) et dates utiles. */
export async function donneesEditeur(db: SupabaseClient<Database>) {
  const { data } = await db
    .from("exercices_ref")
    .select("id, nom, nom_fr, partie_corps, equipement, image_url")
    .eq("source", SOURCE_EXERCICES)
    .order("nom")
    .limit(3000);
  const refs = (data ?? []).map((e) => ({
    id: e.id,
    nom: nomAffiche(e),
    partie: libellePartie(e.partie_corps),
    partieCle: e.partie_corps ?? "",
    equipement: e.equipement,
    image: e.image_url,
  }));
  const auj = aujourdhui();
  const js = new Date(auj + "T12:00:00Z").getUTCDay();
  const { data: prog } = await db.from("programmes").select("id").eq("actif", true).maybeSingle();
  return { refs, dates: { aujourdhui: auj, lundi: decaler(auj, js === 1 ? 7 : (8 - js) % 7) }, programmeActif: !!prog };
}
