import type { Metadata } from "next";
import { RealtimeRefresh } from "@/components/RealtimeRefresh";
import { aujourdhui, session } from "@/lib/session";
import { Habitudes } from "./Habitudes";

export const metadata: Metadata = { title: "Habitudes" };

export default async function PageHabitudes() {
  const { supabase } = await session();
  const jour = aujourdhui();
  const [{ data: habitudes }, { data: logs }] = await Promise.all([
    supabase.from("habitudes").select("id, nom, moment, non_negociable, ordre").eq("actif", true).order("ordre"),
    supabase.from("habitudes_log").select("habitude_id, fait").eq("jour", jour),
  ]);
  const faites = new Set((logs ?? []).filter((l) => l.fait).map((l) => l.habitude_id));
  return (
    <>
      <RealtimeRefresh tables={["habitudes", "habitudes_log"]} />
      <Habitudes jour={jour} habitudes={(habitudes ?? []).map((h) => ({ ...h, fait: faites.has(h.id) }))} />
    </>
  );
}
