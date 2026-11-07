"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/** Rafraîchit la page (RSC) quand une des tables change côté Supabase : une ligne ajoutée par l'agent apparaît sans recharger. */
export function RealtimeRefresh({ tables }: { tables: string[] }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const canal = supabase.channel(`refresh:${tables.join(",")}`);
    for (const table of tables) {
      canal.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 150);
      });
    }
    canal.subscribe();
    return () => {
      clearTimeout(timer);
      supabase.removeChannel(canal);
    };
  }, [router, tables]);
  return null;
}
