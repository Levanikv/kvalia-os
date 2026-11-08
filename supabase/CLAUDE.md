# supabase — schéma et données

Projet distant `gspidvxtnmtgifnlgcsu` (eu-west-3). Pas de stack locale pour l'instant : les migrations sont appliquées au projet distant (MCP Supabase `apply_migration` ou `supabase db push`).

- `migrations/YYYYMMDDHHMMSS_nom.sql` — une migration = un fichier, idempotente autant que possible (`if not exists`, `create or replace`). Toute table a `user_id uuid not null references auth.users`, RLS activée, politiques owner (`owner_select/insert/update/delete`). Les tables de référence (ex. `exercices_ref`) sont en lecture pour `authenticated`.
- Après une migration : **régénérer les types** (`pnpm db:types` ou MCP `generate_typescript_types` → `packages/core/src/database.types.ts`) et, si une table est lue en temps réel par l'app, l'ajouter à la publication `supabase_realtime` (+ `replica identity full`).
- `vue_jour(p_jour date, p_user_id uuid)` — RPC qui agrège la journée (séance, courses, tâches, habitudes) ; elle filtre sur `coalesce(auth.uid(), p_user_id)` pour marcher côté app (RLS) et côté agent (service role).
- `seed/exercices_ref.sql` + `seed/exercices_ref.source.json` — 317 exercices (free-exercise-db-with-videos, MIT). Regénérés par `apps/agent/scripts/seed-exercices.mjs`.
- Conventions de nommage : tables et colonnes en **français**, `snake_case`, dates `jour date`, horodatages `*_le timestamptz`, états en enum (`seance_etat`…). Pas de `camelCase` en base.
- Jamais de données personnelles dans les migrations ou le seed.
