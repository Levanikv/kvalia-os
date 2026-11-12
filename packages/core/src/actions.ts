/**
 * Implémentation des outils (règles métier v0). Un seul endroit : le serveur MCP (apps/agent) et l'app web
 * (server actions) appellent `executer` avec un client Supabase — service role côté agent, session utilisateur côté web.
 */
import type { KvaliaClient } from "./supabase";
import type { VueJour } from "./schemas";
import type { ToolInput, ToolName, ToolOutput } from "./tools";
import {
  ParametresSport,
  appliquerProfil,
  ciblesDepuisProfil,
  cocherExercice,
  enregistrerParametresSport,
  equivalents,
  genererProgramme,
  historiqueCharge,
  noterCharge,
  parametresSport,
  remplacerExercice,
  seancesDuJour,
  seancePrincipale,
  terminerSeance,
} from "./sport";
import { enregistrerParametresNutrition, parametresNutrition } from "./nutrition";
import { pilotageSasu, synchroniserTiime } from "./entreprise";
import type { AuthTiime, ClientTiime, DefiConnexion } from "./tiime";

/**
 * `tiime` n'existe que côté agent (secrets Tiime, ADR 0010) ; l'app web lit les tables synchronisées.
 */
export type ContexteOutil = { db: KvaliaClient; userId: string; tiime?: { auth: AuthTiime; client: ClientTiime } };
type Ctx = ContexteOutil;

function tiimeOuErreur(ctx: Ctx): NonNullable<Ctx["tiime"]> {
  if (!ctx.tiime) throw new Error("Tiime n'est joignable que par l'agent (secrets côté agent) : passer par l'agent KVALIA OS");
  return ctx.tiime;
}

function reponseConnexion(defi: DefiConnexion | null) {
  return defi
    ? {
        statut: "code_requis" as const,
        methode: defi.methode || null,
        attend_code: defi.attend_code,
        message: defi.message || (defi.attend_code ? "Tiime attend un code de vérification" : "Valider la notification dans l'app Tiime"),
      }
    : { statut: "connecte" as const, methode: null, attend_code: false, message: "Connecté à Tiime" };
}

async function listeActiveId(ctx: Ctx): Promise<string> {
  const { data } = await ctx.db
    .from("listes")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("etat", "active")
    .order("creee_le", { ascending: false })
    .limit(1)
    .maybeSingle();
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
    .from("produits")
    .insert({ user_id: ctx.userId, nom: nomNorm, unite: unite ?? "pièce" })
    .select("id")
    .single();
  if (error) throw error;
  return cree.id;
}

/** Fuseau de l'utilisateur (v0 : un seul utilisateur, Paris). Le serveur tourne en UTC : « aujourd'hui » doit être calendaire côté utilisateur. */
export const FUSEAU = process.env.KVALIA_TZ ?? "Europe/Paris";

/** Date du jour (YYYY-MM-DD) dans le fuseau de l'utilisateur. */
export function aujourdhuiIso(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: FUSEAU, year: "numeric", month: "2-digit", day: "2-digit" }).format(maintenant);
}

/** Date relative FR → ISO (v0 : demain, après-demain, jours de la semaine, jj/mm, ISO). */
export function resoudreDate(texte: string | undefined, base = new Date()): string | null {
  if (!texte) return null;
  const t = texte.trim().toLowerCase();
  const d = new Date(base);
  d.setHours(12, 0, 0, 0);
  const iso = (x: Date) => x.toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  if (t === "aujourd'hui" || t === "aujourd’hui") return iso(d);
  if (t === "demain") {
    d.setDate(d.getDate() + 1);
    return iso(d);
  }
  if (t === "après-demain" || t === "apres-demain") {
    d.setDate(d.getDate() + 2);
    return iso(d);
  }
  const jours = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const j = jours.indexOf(t);
  if (j >= 0) {
    const delta = (j - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + delta);
    return iso(d);
  }
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
          const { data, error } = await ctx.db
            .from("lignes")
            .update({ quantite: Number(existante.quantite) + a.quantite, coche: false })
            .eq("id", existante.id)
            .select()
            .single();
          if (error) throw error;
          lignes.push(data);
        } else {
          const { data, error } = await ctx.db
            .from("lignes")
            .insert({
              user_id: ctx.userId,
              liste_id,
              produit_id: pid,
              quantite: a.quantite,
              unite: a.unite ?? null,
              origine: e.origine,
            })
            .select()
            .single();
          if (error) throw error;
          lignes.push(data);
        }
      }
      return { liste_id, lignes } as ToolOutput<T>;
    }

    case "liste_actuelle": {
      const { data: liste, error: errListe } = await ctx.db
        .from("listes")
        .select("id")
        .eq("user_id", ctx.userId)
        .eq("etat", "active")
        .order("creee_le", { ascending: false })
        .limit(1)
        .maybeSingle();
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
      const { data, error } = await ctx.db
        .from("taches")
        .insert({
          user_id: ctx.userId,
          titre: e.titre,
          due: resoudreDate(e.due),
          priorite: e.priorite,
        })
        .select("id, titre, due, priorite, fait")
        .single();
      if (error) throw error;
      return data as ToolOutput<T>;
    }

    case "agenda_du_jour": {
      const e = entree as ToolInput<"agenda_du_jour">;
      const jour = e.jour ?? aujourdhuiIso();
      const { data, error } = await ctx.db
        .from("evenements_cache")
        .select("id, titre, debut, fin, lieu")
        .eq("user_id", ctx.userId)
        .gte("debut", `${jour}T00:00:00Z`)
        .lt("debut", `${jour}T23:59:59Z`)
        .order("debut");
      if (error) throw error;
      return { jour, evenements: data ?? [] } as ToolOutput<T>;
    }

    case "brief": {
      const e = entree as ToolInput<"brief">;
      // vue_jour(p_jour, p_user_id) : filtre sur coalesce(auth.uid(), p_user_id).
      // Avec le service role (auth.uid() nul) on nomme l'utilisateur ; avec un JWT utilisateur, auth.uid() prime
      // et la RLS des tables empêche de lire la journée de quelqu'un d'autre.
      const { data, error } = await ctx.db.rpc("vue_jour", { p_jour: e.jour ?? aujourdhuiIso(), p_user_id: ctx.userId });
      if (error) throw error;
      return data as VueJour as ToolOutput<T>;
    }

    // ---------- Sport ----------
    case "parametres_sport": {
      return (await parametresSport(ctx.db, ctx.userId)) as ToolOutput<T>;
    }

    case "regler_sport": {
      const e = entree as ToolInput<"regler_sport">;
      const actuels = await parametresSport(ctx.db, ctx.userId);
      const profil = e.profil ? { ...(actuels.profil ?? {}), ...e.profil } : actuels.profil;
      const onboarding = e.onboarding ? { ...(actuels.onboarding ?? {}), ...e.onboarding } : actuels.onboarding;
      let fusion = ParametresSport.parse({ ...actuels, ...e, rythme: { ...actuels.rythme, ...(e.rythme ?? {}) }, profil, onboarding });
      // Des réponses d'onboarding arrivent : elles pilotent le programme, et la nutrition si l'utilisateur l'a choisi.
      if (e.profil) {
        fusion = appliquerProfil(fusion, fusion.profil);
        const cibles = ciblesDepuisProfil(fusion.profil);
        if (cibles && (fusion.profil?.nutrition === "ia" || fusion.profil?.nutrition === "saisie")) {
          const n = await parametresNutrition(ctx.db, ctx.userId);
          await enregistrerParametresNutrition(ctx.db, ctx.userId, { ...n, cible_kcal: cibles.kcal_repos, proteines_g: cibles.proteines_g });
        }
      }
      await enregistrerParametresSport(ctx.db, ctx.userId, fusion);
      return fusion as ToolOutput<T>;
    }

    case "generer_programme": {
      const e = entree as ToolInput<"generer_programme">;
      const base = await parametresSport(ctx.db, ctx.userId);
      const params = e.parametres ? ParametresSport.parse({ ...base, ...e.parametres, rythme: { ...base.rythme, ...(e.parametres.rythme ?? {}) } }) : base;
      if (e.parametres) await enregistrerParametresSport(ctx.db, ctx.userId, params);
      return (await genererProgramme(ctx.db, ctx.userId, params, e.debut)) as ToolOutput<T>;
    }

    case "seance_du_jour": {
      const e = entree as ToolInput<"seance_du_jour">;
      const jour = e.jour ?? aujourdhuiIso();
      const brutes = await seancesDuJour(ctx.db, ctx.userId, jour);
      const seances = brutes.map((s) => {
        const exercices = s.exercices_seance.map((x) => ({
          id: x.id,
          ordre: x.ordre,
          exercice: x.exercices_ref?.nom ?? "?",
          exercice_id: x.exercice_id,
          partie_corps: x.exercices_ref?.partie_corps ?? null,
          series: x.series,
          reps: x.reps,
          repos_s: x.repos_s,
          duree_s: x.duree_s,
          kcal: x.kcal === null ? null : Number(x.kcal),
          fait: x.fait,
        }));
        return {
          id: s.id,
          jour: s.jour,
          type: s.type,
          titre: s.titre,
          etat: s.etat,
          focus: s.focus,
          bloc: s.bloc,
          semaine: s.semaine,
          duree_min: s.duree_min,
          kcal: s.kcal === null ? null : Number(s.kcal),
          kcal_prevues: exercices.reduce((a, x) => a + (x.kcal ?? 0), 0),
          notes: s.notes,
          exercices,
        };
      });
      return { jour, seance: seancePrincipale(seances), seances } as ToolOutput<T>;
    }

    case "cocher_exercice": {
      const e = entree as ToolInput<"cocher_exercice">;
      return (await cocherExercice(ctx.db, ctx.userId, e.exercice_seance_id, e.fait)) as ToolOutput<T>;
    }

    case "terminer_seance": {
      const e = entree as ToolInput<"terminer_seance">;
      return (await terminerSeance(ctx.db, ctx.userId, e.seance_id, e.ressenti, e.notes)) as ToolOutput<T>;
    }

    case "noter_charge": {
      const e = entree as ToolInput<"noter_charge">;
      return (await noterCharge(ctx.db, ctx.userId, e.exercice_seance_id, {
        charge_kg: e.charge_kg,
        reps_faites: e.reps_faites,
        note: e.note,
      })) as ToolOutput<T>;
    }

    case "historique_exercice": {
      const e = entree as ToolInput<"historique_exercice">;
      return (await historiqueCharge(ctx.db, ctx.userId, e.exercice_id, e.limite)) as ToolOutput<T>;
    }

    case "equivalents_exercice": {
      const e = entree as ToolInput<"equivalents_exercice">;
      const { data: ligne, error } = await ctx.db
        .from("exercices_seance")
        .select("exercice_id, seance_id")
        .eq("id", e.exercice_seance_id)
        .eq("user_id", ctx.userId)
        .single();
      if (error) throw error;
      const { data: autres } = await ctx.db.from("exercices_seance").select("exercice_id").eq("seance_id", ligne.seance_id);
      const params = await parametresSport(ctx.db, ctx.userId);
      const liste = await equivalents(
        ctx.db,
        ligne.exercice_id,
        params.materiel,
        (autres ?? []).map((a) => a.exercice_id),
        e.limite,
      );
      return liste.map((x) => ({
        id: x.id,
        nom: x.nom,
        nom_fr: x.nom_fr,
        partie_corps: x.partie_corps,
        equipement: x.equipement,
        compose: x.compose,
        raison: x.raison,
        score: x.score,
      })) as ToolOutput<T>;
    }

    case "remplacer_exercice": {
      const e = entree as ToolInput<"remplacer_exercice">;
      return (await remplacerExercice(ctx.db, ctx.userId, e.exercice_seance_id, e.nouvel_exercice_id, e.portee)) as ToolOutput<T>;
    }

    // ---------- Entreprise (Tiime, lecture seule) ----------
    case "connecter_tiime": {
      const e = entree as ToolInput<"connecter_tiime">;
      return reponseConnexion(await tiimeOuErreur(ctx).auth.demarrerConnexion(e.methode)) as ToolOutput<T>;
    }

    case "valider_code_tiime": {
      const e = entree as ToolInput<"valider_code_tiime">;
      return reponseConnexion(await tiimeOuErreur(ctx).auth.validerCode(e.code)) as ToolOutput<T>;
    }

    case "synchroniser_tiime": {
      const e = entree as ToolInput<"synchroniser_tiime">;
      return (await synchroniserTiime(ctx.db, ctx.userId, tiimeOuErreur(ctx).client, { depuis: e.depuis })) as ToolOutput<T>;
    }

    case "pilotage_sasu": {
      const e = entree as ToolInput<"pilotage_sasu">;
      return (await pilotageSasu(ctx.db, ctx.userId, e.annee ?? Number(aujourdhuiIso().slice(0, 4)))) as ToolOutput<T>;
    }
  }
  throw new Error(`Outil inconnu : ${String(nom)}`);
}
