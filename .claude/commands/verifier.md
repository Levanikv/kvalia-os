---

description: Lance toutes les vérifications du repo (types, lint, tests, doc des outils) et, si le web a changé, le build Next. Résume ce qui casse et corrige.
allowed-tools: Bash(pnpm *), Read, Edit
---

Lance `pnpm check`. Si `apps/web` apparaît dans `git diff --name-only HEAD`, lance aussi `NEXT_PUBLIC_SUPABASE_URL=https://gspidvxtnmtgifnlgcsu.supabase.co NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_GYFhG5yEJyU5zE1pPIEXyg_43urNC8G pnpm --filter @kvalia/web build`.
Pour chaque erreur : explique la cause en une ligne, corrige, relance. Ne désactive jamais une règle de lint pour passer. Termine par la liste des fichiers modifiés et ce qui reste à tester sur le téléphone.
