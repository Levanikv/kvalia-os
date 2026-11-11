/**
 * Faux client Supabase en mémoire pour tester les règles métier sans réseau.
 * Couvre le sous-ensemble de l'API PostgREST utilisé dans `src/` : from().select/eq/neq/in/gte/lte/gt/lt/not/order/limit,
 * maybeSingle/single, insert (avec ids générés), update().eq, delete().eq/in/gte, rpc (stub).
 * Les jointures embarquées (`table!fk(...)`, `table!inner(...)`) sont résolues de façon simple par clé `<table>_id`.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

type Ligne = Record<string, any>;
type Filtre = (l: Ligne) => boolean;

export type Tables = Record<string, Ligne[]>;

/** Valeurs par défaut des colonnes (comme le schéma Postgres) appliquées à l'insert. */
const DEFAUTS: Record<string, Ligne> = {
  exercices_seance: {
    fait: false,
    fait_le: null,
    charge_kg: null,
    realise: null,
    substitut_de: null,
    kcal: null,
    duree_s: null,
    repos_s: 90,
    reps: "10",
    series: 3,
    ordre: 0,
  },
  seances: {
    etat: "prevue",
    kcal: null,
    debut_le: null,
    faite_le: null,
    ressenti: null,
    notes: null,
    titre: null,
    focus: null,
    bloc: null,
    semaine: null,
    duree_min: null,
    programme_id: null,
  },
  programmes: { actif: true, fin: null, materiel: [], rythme: {}, genere_par: null, objectif_id: null },
  pesees: { note: null },
  profils: { reglages: {}, prenom: null, contexte_agent: null },
};

export function fausseDb(tables: Tables) {
  const t: Tables = tables;
  const get = (nom: string) => (t[nom] ??= []);

  function requete(table: string) {
    const filtres: Filtre[] = [];
    let tri: { col: string; asc: boolean } | null = null;
    let limite: number | null = null;
    let colonnes = "*";
    let compte = false;
    let tete = false;

    // Résout `exercices_ref!fk(...)`, `seances!inner(...)` en objets imbriqués
    const embarquer = (l: Ligne): Ligne => {
      const out = { ...l };
      const re = /(\w+)!?(\w+)?\(([^()]*)\)/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(colonnes))) {
        const cible = m[1];
        const fk = `${cible === "exercices_ref" ? "exercice" : cible.replace(/s$/, "")}_id`;
        const parent = get(cible).find((r) => r.id === l[fk]);
        const enfants = get(cible).filter((r) => r[`${table.replace(/s$/, "")}_id`] === l.id);
        out[cible] = parent ?? (enfants.length ? enfants : null);
      }
      // Filtre sur table embarquée : `seances.programme_id` → on applique sur l'objet embarqué
      return out;
    };

    const resultat = () => {
      let rows = get(table).filter((l) => filtres.every((f) => f(l)));
      if (tri) rows = [...rows].sort((a, b) => (a[tri!.col] < b[tri!.col] ? (tri!.asc ? -1 : 1) : a[tri!.col] > b[tri!.col] ? (tri!.asc ? 1 : -1) : 0));
      if (limite !== null) rows = rows.slice(0, limite);
      return rows.map(embarquer).filter((l) => filtresEmb.every((f) => f(l)));
    };
    const filtresEmb: Filtre[] = [];
    const champ = (c: string) => {
      if (c.includes(".")) {
        const [tab, col] = c.split(".");
        return { emb: true, get: (l: Ligne) => l[tab]?.[col] };
      }
      return { emb: false, get: (l: Ligne) => l[c] };
    };
    const ajouter = (c: string, pred: (v: any) => boolean) => {
      const { emb, get: g } = champ(c);
      (emb ? filtresEmb : filtres).push((l) => pred(g(l)));
    };

    const q: any = {
      select(cols = "*", opts?: { count?: string; head?: boolean }) {
        colonnes = cols;
        compte = !!opts?.count;
        tete = !!opts?.head;
        return q;
      },
      eq(c: string, v: any) {
        ajouter(c, (x) => x === v);
        return q;
      },
      neq(c: string, v: any) {
        ajouter(c, (x) => x !== v);
        return q;
      },
      in(c: string, v: any[]) {
        ajouter(c, (x) => v.includes(x));
        return q;
      },
      gte(c: string, v: any) {
        ajouter(c, (x) => x >= v);
        return q;
      },
      lte(c: string, v: any) {
        ajouter(c, (x) => x <= v);
        return q;
      },
      gt(c: string, v: any) {
        ajouter(c, (x) => x > v);
        return q;
      },
      lt(c: string, v: any) {
        ajouter(c, (x) => x < v);
        return q;
      },
      not(c: string, op: string, v: any) {
        if (op === "is" && v === null) ajouter(c, (x) => x !== null && x !== undefined);
        return q;
      },
      order(c: string, o?: { ascending?: boolean }) {
        tri = { col: c, asc: o?.ascending !== false };
        return q;
      },
      limit(n: number) {
        limite = n;
        return q;
      },
      maybeSingle() {
        return Promise.resolve({ data: resultat()[0] ?? null, error: null });
      },
      single() {
        const r = resultat()[0];
        return Promise.resolve(r ? { data: r, error: null } : { data: null, error: { message: "Aucune ligne", code: "PGRST116" } });
      },
      then(res: (v: any) => void) {
        const rows = resultat();
        res(compte ? { data: tete ? null : rows, count: rows.length, error: null } : { data: rows, error: null });
      },
      insert(v: Ligne | Ligne[]) {
        const arr = (Array.isArray(v) ? v : [v]).map((r) => ({ id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAUTS[table] ?? {}), ...r }));
        get(table).push(...arr);
        const sel: any = {
          select: () => ({ single: () => Promise.resolve({ data: arr[0], error: null }), then: (res: any) => res({ data: arr, error: null }) }),
          then: (res: any) => res({ error: null }),
        };
        return sel;
      },
      /** upsert(lignes, { onConflict: "a,b" }) : fusionne sur les colonnes de conflit, sinon insère (comme PostgREST). */
      upsert(v: Ligne | Ligne[], opts?: { onConflict?: string }) {
        const cles = (opts?.onConflict ?? "id").split(",").map((c) => c.trim());
        const touches: Ligne[] = [];
        for (const r of Array.isArray(v) ? v : [v]) {
          const existante = get(table).find((l) => cles.every((c) => l[c] === r[c]));
          if (existante) {
            Object.assign(existante, r);
            touches.push(existante);
          } else {
            const nouvelle = { id: randomUUID(), created_at: new Date().toISOString(), ...(DEFAUTS[table] ?? {}), ...r };
            get(table).push(nouvelle);
            touches.push(nouvelle);
          }
        }
        return {
          select: () => ({ single: () => Promise.resolve({ data: touches[0], error: null }), then: (res: any) => res({ data: touches, error: null }) }),
          then: (res: any) => res({ error: null }),
        };
      },
      update(patch: Ligne) {
        const appliquer = () => {
          const touches: Ligne[] = [];
          for (const l of get(table))
            if (filtres.every((f) => f(l))) {
              Object.assign(l, patch);
              touches.push(l);
            }
          return touches;
        };
        const u: any = {
          eq(c: string, v: any) {
            filtres.push((l) => l[c] === v);
            return u;
          },
          in(c: string, v: any[]) {
            filtres.push((l) => v.includes(l[c]));
            return u;
          },
          select(cols = "*") {
            colonnes = cols;
            return {
              single() {
                const r = appliquer()[0];
                return Promise.resolve(r ? { data: embarquer(r), error: null } : { data: null, error: { message: "Aucune ligne", code: "PGRST116" } });
              },
              maybeSingle() {
                const r = appliquer()[0];
                return Promise.resolve({ data: r ? embarquer(r) : null, error: null });
              },
              then(res: any) {
                res({ data: appliquer().map(embarquer), error: null });
              },
            };
          },
          then(res: any) {
            appliquer();
            res({ error: null });
          },
        };
        return u;
      },
      delete() {
        const d: any = {
          eq(c: string, v: any) {
            filtres.push((l) => l[c] === v);
            return d;
          },
          in(c: string, v: any[]) {
            filtres.push((l) => v.includes(l[c]));
            return d;
          },
          gte(c: string, v: any) {
            filtres.push((l) => l[c] >= v);
            return d;
          },
          then(res: any) {
            t[table] = get(table).filter((l) => !filtres.every((f) => f(l)));
            res({ error: null });
          },
        };
        return d;
      },
    };
    return q;
  }

  return {
    tables: t,
    from: (table: string) => requete(table),
    rpc: (_nom: string, _args: unknown) => Promise.resolve({ data: null, error: { message: "rpc non simulé" } }),
  } as any;
}

/** Les 317 exercices du référentiel, mappés comme le seed (sans réseau). */
export function exercicesRef(): Ligne[] {
  const src = JSON.parse(readFileSync(fileURLToPath(new URL("../../../supabase/seed/exercices_ref.source.json", import.meta.url)), "utf8")) as Array<
    Record<string, any>
  >;
  const met = (e: any) => (e.bodyPart === "cardio" ? 8 : e.equipment === "body weight" ? (e.compound ? 5 : 3.8) : e.compound ? 6 : 4.5);
  return src.map((e) => ({
    id: e.id,
    nom: e.name,
    nom_fr: null,
    muscles: [e.target, ...(e.muscleGroup && e.muscleGroup !== e.target ? [e.muscleGroup] : [])].filter(Boolean),
    muscles_secondaires: e.secondaryMuscles ?? [],
    equipement: e.equipment ?? null,
    partie_corps: e.bodyPart ?? null,
    difficulte: e.difficulty ?? null,
    compose: Boolean(e.compound),
    unilateral: Boolean(e.unilateral),
    met: met(e),
    image_url: null,
    video_url: null,
  }));
}

export const USER = "00000000-0000-4000-8000-000000000001";
