/**
 * Schémas zod = contrat unique entre l'API, la PWA et les outils MCP.
 * Les noms de champs suivent les colonnes Postgres (voir supabase/migrations).
 */
import { z } from "zod";

// ---------- Transverse ----------
export const Unite = z.enum(["g", "ml", "pièce"]);

export const Produit = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1),
  rayon: z.string().nullable(),
  unite: z.string().default("pièce"),
  code_barres: z.string().nullable().optional(),
  kcal_100: z.number().nullable().optional(),
  prot_100: z.number().nullable().optional(),
  gluc_100: z.number().nullable().optional(),
  lip_100: z.number().nullable().optional(),
});
export type Produit = z.infer<typeof Produit>;

export const ObjectifType = z.enum(["sport", "epargne", "habitude", "autre"]);
export const Objectif = z.object({
  id: z.string().uuid(),
  titre: z.string().min(1),
  type: ObjectifType,
  cible: z.number().nullable(),
  valeur: z.number(),
  unite: z.string().nullable(),
  echeance: z.string().date().nullable(),
  actif: z.boolean(),
});
export type Objectif = z.infer<typeof Objectif>;

export const DocumentType = z.enum([
  "identite", "logement", "voiture", "sante", "sasu", "banque", "contrat", "voyage", "facture", "autre",
]);

// ---------- Quotidien ----------
export const Priorite = z.enum(["basse", "normale", "haute"]);
export const Tache = z.object({
  id: z.string().uuid(),
  titre: z.string().min(1),
  due: z.string().date().nullable(),
  priorite: Priorite,
  fait: z.boolean(),
});
export type Tache = z.infer<typeof Tache>;

export const MomentJournee = z.enum(["matin", "midi", "soir", "coucher", "libre"]);
export const Habitude = z.object({
  id: z.string().uuid(),
  nom: z.string().min(1),
  moment: MomentJournee,
  non_negociable: z.boolean(),
  actif: z.boolean(),
  ordre: z.number().int(),
});
export type Habitude = z.infer<typeof Habitude>;

// ---------- Courses ----------
export const LigneOrigine = z.enum(["manuel", "plan", "agent", "siri", "alexa", "telegram"]);
export const Ligne = z.object({
  id: z.string().uuid(),
  liste_id: z.string().uuid(),
  produit_id: z.string().uuid(),
  quantite: z.number().positive(),
  unite: z.string().nullable(),
  coche: z.boolean(),
  manque: z.boolean(),
  origine: LigneOrigine,
});
export type Ligne = z.infer<typeof Ligne>;

export const ListeEtat = z.enum(["active", "faite", "archivee"]);

// ---------- Vue Jour (sortie de la fonction SQL vue_jour) ----------
export const VueJour = z.object({
  jour: z.string().date(),
  evenements: z.array(z.object({
    id: z.string(), titre: z.string(), debut: z.string(), fin: z.string().nullable(), lieu: z.string().nullable(),
  })),
  taches: z.array(z.object({
    id: z.string().uuid(), titre: z.string(), due: z.string().nullable(), priorite: Priorite, fait: z.boolean(),
  })),
  habitudes: z.array(z.object({
    id: z.string().uuid(), nom: z.string(), moment: MomentJournee, non_negociable: z.boolean(), fait: z.boolean(),
  })),
  seance: z.object({
    id: z.string().uuid(), type: z.string(), titre: z.string().nullable().optional(), duree_min: z.number().nullable(), etat: z.string(),
    kcal: z.number().nullable().optional(), nb_exercices: z.number(), nb_faits: z.number().optional(),
  }).nullable(),
  repas: z.array(z.object({
    repas: z.string(), recette_id: z.string().uuid(), recette: z.string(), portions: z.number(), pris: z.boolean(),
  })),
  courses: z.object({ liste_id: z.string().uuid(), articles: z.number(), manques: z.number() }).nullable(),
  depenses_semaine: z.number(),
  objectifs: z.array(z.object({
    id: z.string().uuid(), titre: z.string(), type: ObjectifType, valeur: z.number(), cible: z.number().nullable(), echeance: z.string().nullable(),
  })),
  alertes: z.array(z.object({ document_id: z.string().uuid(), titre: z.string(), expiration: z.string() })),
});
export type VueJour = z.infer<typeof VueJour>;
