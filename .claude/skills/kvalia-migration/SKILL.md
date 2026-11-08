---

name: kvalia-migration
description: Ajouter une migration Supabase à KVALIA OS (table, colonne, enum, RPC) avec RLS, Realtime, régénération des types et mise à jour de vue_jour. À utiliser pour tout changement de schéma.
---

# Migration KVALIA OS

Suis `docs/recettes/ajouter-une-migration.md` et `supabase/CLAUDE.md`. Résumé :

1. `supabase/migrations/$(date -u +%Y%m%d%H%M%S)_<nom>.sql`, idempotent.
2. Table : `id`, `user_id` (FK auth.users, cascade), `created_at`, colonnes FR `snake_case`, RLS + 4 politiques owner, index `(user_id, …)`. Référentiel : lecture `authenticated`.
3. Lue en direct par l'app → publication `supabase_realtime` + `replica identity full`. Visible dans la journée → recréer `vue_jour`.
4. Appliquer (MCP Supabase `apply_migration` ou `pnpm db:push`), puis `get_advisors`.
5. Types : `pnpm db:types` ou MCP `generate_typescript_types` → `packages/core/src/database.types.ts`.
6. Core : zod + règles + tests (`DEFAUTS` dans `test/fausse-db.ts` pour la nouvelle table).
7. `pnpm check` ; commit `feat(db): …` (migration + types ensemble). Ne jamais modifier une migration déjà appliquée.
