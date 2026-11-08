import type { Metadata } from "next";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { session } from "@/lib/session";
import { ListeCourses, type LigneAffichee } from "./ListeCourses";

export const metadata: Metadata = { title: "Courses" };

export default async function Courses() {
  const { supabase } = await session();
  const { data: liste } = await supabase
    .from("listes")
    .select("id, creee_le")
    .eq("etat", "active")
    .order("creee_le", { ascending: false })
    .limit(1)
    .maybeSingle();

  let lignes: LigneAffichee[] = [];
  if (liste) {
    const { data } = await supabase
      .from("lignes")
      .select("id, quantite, unite, coche, manque, origine, created_at, produits(nom, rayon)")
      .eq("liste_id", liste.id)
      .order("created_at");
    lignes = (data ?? []).map((l) => ({
      id: l.id,
      quantite: Number(l.quantite),
      unite: l.unite,
      coche: l.coche,
      manque: l.manque,
      origine: l.origine,
      produit: l.produits?.nom ?? "?",
      rayon: l.produits?.rayon ?? null,
    }));
  }

  return (
    <>
      <RealtimeRefresh tables={["lignes", "listes"]} />
      <ListeCourses listeId={liste?.id ?? null} lignes={lignes} />
    </>
  );
}
