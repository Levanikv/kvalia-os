import type { Metadata } from "next";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { session } from "@/lib/session";
import { Taches, type TacheAffichee } from "./Taches";

export const metadata: Metadata = { title: "Tâches" };

export default async function PageTaches() {
  const { supabase } = await session();
  const { data } = await supabase
    .from("taches").select("id, titre, due, priorite, fait")
    .order("fait").order("due", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <RealtimeRefresh tables={["taches"]} />
      <Taches taches={(data ?? []) as TacheAffichee[]} />
    </>
  );
}
