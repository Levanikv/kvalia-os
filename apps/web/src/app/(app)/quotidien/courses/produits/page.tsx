import { Placeholder } from "@/components/Placeholder";
import { session } from "@/lib/session";

export default async function Produits() {
  const { supabase } = await session();
  const { data } = await supabase.from("produits").select("id, nom, rayon, unite").order("nom");
  return (
    <div className="pt-2">
      <ul className="overflow-hidden rounded-lg border border-border bg-surface-2">
        {(data ?? []).map((p) => (
          <li key={p.id} className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
            <span>{p.nom}</span>
            <span className="text-xs text-text-3">
              {p.rayon ?? "sans rayon"} · {p.unite}
            </span>
          </li>
        ))}
        {(data ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-text-3">Aucun produit.</li>}
      </ul>
      <Placeholder
        phase="1"
        ecran="Produits & stock"
        points={["Rayon et ordre du magasin éditables", "Stock maison mis à jour par « courses faites »", "Macros par produit (Open Food Facts)"]}
      />
    </div>
  );
}
