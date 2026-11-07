/**
 * Implémentation des outils (règles métier v0). Un seul endroit : le serveur MCP (apps/agent) et l'app web
 * (server actions) appellent `executer` avec un client Supabase — service role côté agent, session utilisateur côté web.
 */
import type { KvaliaClient } from "./supabase";
import type { VueJour } from "./schemas";
import type { ToolInput, ToolName, ToolOutput } from "./tools";

export type ContexteOutil = { db: KvaliaClient; userId: string };
type Ctx = ContexteOutil;

async function listeActiveId(ctx: Ctx): Promise<string> {
  const { data } = await ctx.db
    .from("listes").select("id").eq("user_id", ctx.userId).eq("etat", "active")
    .order("creee_le", { ascending: false }).limit(1).maybeSingle();
  if (data) return data.id;
  const { data: creee, error } = await ctx.db.from("listes").insert({ user_id: ctx.userId }).select("id").single();
  if (error) throw error;
  return creee.id;
}

async function produitId(ctx: Ctx, nom: string, unite?: string): Promise<string> {
  const nomNorm = nom.trim().toLowerCase();
  const { data } = await ctx.db.from("produits").select("id").eq("user_id", ctx.userId).ilike("nom", nomNorm).maybeSingle();
  if (data) return data.id;
  const { data: cree, error } = await ctx.db
    .from("produits").insert({ user_id: ctx.userId, nom: nomNorm, unite: unite ?? "pièce" }).select("id").single();
  if (error) throw error;
  return cree.id;
}

/** Date relative FR → ISO (v0 : demain, après-demain, jours de la semaine, jj/mm, ISO). */
export function resoudreDate(texte: string | undefined, base = new Date()): string | null {
  if (!texte) return null;
  const t = texte.trim().toLowerCase();
  const d = new Date(base); d.setHours(12, 0, 0, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (t === "aujourd'hui" || t === "aujourd’hui") return iso(d);
  if (t === "demain") { d.setDate(d.getDate() + 1); return iso(d); }
  if (t === "après-demain" || t === "apres-demain") { d.setDate(d.getDate() + 2); return iso(d); }
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const j = jours.indexOf(t);
  if (j >= 0) { const delta = (j - d.getDay() + 7) % 7 || 7; d.setDate(d.getDate() + delta); return iso(d); }
  const m = t.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (m) {
    const annee = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : d.getFullYear();
    const x = new Date(annee, Number(m[2]) - 1, Number(m[1]), 12);
    if (!m[3] && x < d) x.setFullYear(annee + 1);
    return iso(x);
  }
  return null;
}

export async function executer<T extends ToolName>(nom: T, entree: ToolInput<T>, ctx: Ctx): Promise<ToolOutput<T>> {
  switch (nom) {
    case "ajouter_produit": {
      const e = entree as ToolInput<"ajouter_produit">;
      const liste_id = await listeActiveId(ctx);
      const lignes = [];
      for (const a of e.articles) {
        const pid = await produitId(ctx, a.nom, a.unite);
        const { data: existante } = await ctx.db.from("lignes").select("*").eq("liste_id", liste_id).eq("produit_id", pid).maybeSingle();
        if (existante) {
          const { data, error } = await ctx.db.from("lignes")
            .update({ quantite: Number(existante.quantite) + a.quantite, coche: false }).eq("id", existante.id).select().single();
          if (error) throw error; lignes.push(data);
        } else {
          const { data, error } = await ctx.db.from("lignes").insert({
            user_id: ctx.userId, liste_id, produit_id: pid, quantite: a.quantite, unite: a.unite ?? null, origine: e.origine,
          }).select().single();
          if (error) throw error; lignes.push(data);
        }
      }
      return { liste_id, lignes } as ToolOutput<T>;
    }

    case "liste_actuelle": {
      const { data: liste, error: errListe } = await ctx.db.from("listes").select("id").eq("user_id", ctx.userId).eq("etat", "active")
        .order("creee_le", { ascending: false }).limit(1).maybeSingle();
      if (errListe) throw errListe;
      if (!liste) return { liste_id: null, rayons: [] } as ToolOutput<T>;
      const { data: lignes, error } = await ctx.db.from("lignes").select("*, produits(nom, rayon)").eq("liste_id", liste.id);
      if (error) throw error;
      const parRayon = new Map<string | null, unknown[]>();
      for (const l of lignes ?? []) {
        const p = l.produits as unknown as { nom: string; rayon: string | null };
        const { produits: _p, ...reste } = l;
        const arr = parRayon.get(p.rayon) ?? [];
        arr.push({ ...reste, produit: p.nom });
        parRayon.set(p.rayon, arr);
      }
      return { liste_id: liste.id, rayons: [...parRayon].map(([rayon, lignes]) => ({ rayon, lignes })) } as ToolOutput<T>;
    }

    case "ajouter_tache": {
      const e = entree as ToolInput<"ajouter_tache">;
      const { data, error } = await ctx.db.from("taches").insert({
        user_id: ctx.userId, titre: e.titre, due: resoudreDate(e.due), priorite: e.priorite,
      }).select("id, titre, due, priorite, fait").single();
      if (error) throw error;
      return data as ToolOutput<T>;
    }

    case "agenda_du_jour": {
      const e = entree as ToolInput<"agenda_du_jour">;
      const jour = e.jour ?? new Date().toISOString().slice(0, 10);
      const { data, error } = await ctx.db.from("evenements_cache").select("id, titre, debut, fin, lieu")
        .eq("user_id", ctx.userId).gte("debut", `${jour}T00:00:00Z`).lt("debut", `${jour}T23:59:59Z`).order("debut");
      if (error) throw error;
      return { jour, evenements: data ?? [] } as ToolOutput<T>;
    }

    case "brief": {
      const e = entree as ToolInput<"brief">;
      // vue_jour(p_jour, p_user_id) : filtre sur coalesce(auth.uid(), p_user_id).
      // Avec le service role (auth.uid() nul) on nomme l'utilisateur ; avec un JWT utilisateur, auth.uid() prime
      // et la RLS des tables empêche de lire la journée de quelqu'un d'autre.
      const { data, error } = await ctx.db.rpc("vue_jour", { p_jour: e.jour, p_user_id: ctx.userId });
      if (error) throw error;
      return data as VueJour as ToolOutput<T>;
    }
  }
  throw new Error(`Outil inconnu : ${String(nom)}`);
}
