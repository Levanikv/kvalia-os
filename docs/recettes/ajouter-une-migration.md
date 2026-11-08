# Ajouter une migration

1. **Fichier** : `supabase/migrations/YYYYMMDDHHMMSS_<nom>.sql` (UTC, `date -u +%Y%m%d%H%M%S`). Idempotent autant que possible (`if not exists`, `create or replace function`).
2. **Table nouvelle** : `id uuid primary key default gen_random_uuid()`, `user_id uuid not null references auth.users(id) on delete cascade`, `created_at timestamptz not null default now()`, colonnes en français `snake_case`, enums si l'ensemble de valeurs est fermé. Puis :

   ```sql
   alter table public.<t> enable row level security;
   create policy owner_select on public.<t> for select to authenticated using (user_id = (select auth.uid()));
   create policy owner_insert on public.<t> for insert to authenticated with check (user_id = (select auth.uid()));
   create policy owner_update on public.<t> for update to authenticated using (user_id = (select auth.uid()));
   create policy owner_delete on public.<t> for delete to authenticated using (user_id = (select auth.uid()));
   create index on public.<t> (user_id, <colonne de tri>);
   ```
3. **Temps réel** (si l'app lit la table en direct) : `alter publication supabase_realtime add table public.<t>; alter table public.<t> replica identity full;`
4. **Vue Jour** : si la journée doit montrer la nouvelle donnée, recréer `vue_jour` dans la même migration.
5. **Appliquer** : MCP Supabase `apply_migration` (name = le nom du fichier sans horodatage) ou `pnpm db:push`. Puis MCP `get_advisors` (sécurité).
6. **Types** : `pnpm db:types` ou MCP `generate_typescript_types` → écraser `packages/core/src/database.types.ts`.
7. **Core** : adapter schémas zod / règles ; **tests** (`fausse-db.ts` : ajouter les valeurs par défaut de la table dans `DEFAUTS`).
8. **Vérifier** : `pnpm check`. **Livrer** : commit `feat(db): …` avec la migration et les types ensemble.

Pièges : modifier une migration déjà appliquée (toujours en écrire une nouvelle) ; oublier `replica identity full` (Realtime n'envoie pas les anciennes valeurs) ; un `numeric` Postgres arrive en `string` côté JS → `Number()`.
