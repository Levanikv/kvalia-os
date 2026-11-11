# Architecture

## En une phrase

Une base Supabase (Postgres + RLS + Realtime) au centre ; un **noyau TypeScript** (`packages/core`) qui porte le contrat et les règles ; deux clients de ce noyau : la **PWA** (`apps/web`, Next.js) et le **serveur MCP** (`apps/agent`, exposé à claude.ai). L'utilisateur agit soit par l'app, soit en parlant à l'agent — les deux passent par les mêmes fonctions.

```
            ┌──────────────┐  phrase « ajoute du lait »   ┌──────────────────┐
  Levani ──▶│  claude.ai   │ ───────────────────────────▶ │ apps/agent (MCP) │
            └──────────────┘                              │  tools → executer│
                 ▲                                        └────────┬─────────┘
                 │ réponse                                          │ service role, user_id forcé
            ┌────┴─────────┐   server actions → executer   ┌────────▼─────────┐
  iPhone ──▶│  apps/web    │ ─────────────────────────────▶│  packages/core   │
            │  (PWA)       │ ◀── Realtime (postgres_changes)│ tools · actions │
            └──────────────┘                               │ sport · nutrition│
                                                           └────────┬─────────┘
                                                                    │ supabase-js (RLS)
                                                           ┌────────▼─────────┐
                                                           │  Supabase        │
                                                           │  Postgres + RLS  │
                                                           │  Realtime, Auth  │
                                                           └──────────────────┘
```

## Les couches

| Couche          | Rôle                                                                                                   | Ne fait pas                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `supabase/`     | Schéma, RLS, RPC `vue_jour`, publication Realtime, seed de référence                                   | Logique métier (sauf `vue_jour`, agrégation pure)                       |
| `packages/core` | Contrat zod des outils, règles métier, clients                                                         | UI, HTTP, framework                                                     |
| `packages/ui`   | Registre des modules (routes, icônes, onglets), tokens CSS                                             | Composants React (ils sont dans `apps/web` tant qu'il n'y a qu'une app) |
| `apps/web`      | Pages (server components), interactions (client components), server actions qui appellent `executer()` | Règles métier, requêtes d'écriture directes                             |
| `apps/agent`    | Expose `tools` en MCP, authentifie (token), journalise                                                 | Règles métier ; il ne connaît que `executer()`                          |

## Flux d'une action (ex. cocher un exercice)

1. **App** : `Checklist` (client) → `cocher(id, fait)` (server action) → `executer("cocher_exercice", …, { db: supabase SSR, userId })`.
2. **Agent** : claude.ai appelle l'outil `cocher_exercice` → `server.ts` → `executer(…, { db: service role, userId: KVALIA_USER_ID })`.
3. **Core** : `cocherExercice()` met à jour la ligne, recalcule les kcal de la séance, passe la séance en `en_cours` / `prevue`.
4. **Retour** : l'app fait `revalidatePath` + `useOptimistic` ; les autres écrans ouverts reçoivent `postgres_changes` → `RealtimeRefresh` → `router.refresh()`.

## Données clés

- **Identité** : `auth.users` → `profils` (prénom, `reglages` jsonb : `sport`, `nutrition`, widgets…).
- **Quotidien** : `listes` / `lignes` / `produits` (courses), `taches`, `habitudes` / `habitudes_log`.
- **Sport** : `exercices_ref` (référentiel, 317, vidéos H/F, MET), `programmes` (actif, rythme jsonb, matériel), `seances` (jour, type, bloc, semaine, focus, état, kcal, debut_le, faite_le, ressenti), `exercices_seance` (prescription séries/reps/repos, duree_s, kcal, fait, charge_kg, realise jsonb, substitut_de).
- **Nutrition** : `journal_repas`, `pesees`, `recettes`, `plans_repas` (phase 2).
- **Transverse** : `vue_jour` (RPC), `appels_outils` (journal des appels agent), `documents`, `objectifs`.

Le détail des colonnes est dans `packages/core/src/database.types.ts` (généré) ; les décisions dans `docs/decisions/`.

## Déploiement

- **Railway** projet `kvalia-os`, région EU : service `web` (Next build via `apps/web/railpack.json`, healthcheck `/connexion`), service `agent` (racine `railpack.json`, `tsx src/server.ts`, port 8787). Push sur `main` → déploiement des deux.
- **Supabase** : un seul projet (prod). Migrations appliquées via MCP ou CLI. Pas d'environnement de staging en v1 : on teste sur le téléphone avec les vraies données.
- **claude.ai** : connecteur « KVALIA OS » → `https://agent-production-b5d9.up.railway.app/mcp/<token>`. Les nouveaux outils apparaissent après reconnexion du connecteur.

## Ce qui vient (ne pas construire avant l'ADR)

Multi-utilisateur + OAuth MCP · Service worker / hors-ligne · Passkeys · Orchestrateur (Claude Agent SDK) pour les jobs du matin · Siri / Telegram / Alexa · Finances (Enable Banking) · Entreprise : écriture vers Tiime (la lecture est faite, ADR 0010).
