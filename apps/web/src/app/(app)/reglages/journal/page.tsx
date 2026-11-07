import type { Metadata } from "next";
import { ModuleFrame } from "@/components/ModuleFrame";
import { session } from "@/lib/session";

export const metadata: Metadata = { title: "Journal" };

export default async function Journal() {
  const { supabase } = await session();
  const { data } = await supabase.from("appels_outils").select("id, outil, canal, succes, duree_ms, entree, created_at").order("created_at", { ascending: false }).limit(50);
  return (
    <ModuleFrame module="reglages" titre="Journal des appels">
      <ul className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-2">
        {(data ?? []).map((a) => (
          <li key={a.id} className="border-b border-border px-3 py-2 last:border-b-0">
            <div className="flex items-center gap-2 text-sm">
              <span className={`h-2 w-2 rounded-full ${a.succes ? "bg-success" : "bg-danger"}`} />
              <code className="font-medium">{a.outil}</code>
              <span className="text-xs text-text-3">{a.canal} · {a.duree_ms} ms</span>
              <span className="ml-auto text-xs text-text-3">{new Date(a.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            {a.entree && <pre className="mt-1 overflow-x-auto text-[11px] text-text-2">{JSON.stringify(a.entree)}</pre>}
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-text-3">Aucun appel.</li>}
      </ul>
    </ModuleFrame>
  );
}
