# KVALIA OS

Un seul système mobile-first où finances, courses, sport, nutrition et documents sont reliés, et où un agent lit, modifie et répond en langage naturel. Objectif : tout à disposition en moins de 10 secondes.

Principes : **agent-first** (chaque action de l'UI est d'abord un outil MCP), **un noyau, des mini-apps**, **entités transverses** (Produit, Objectif, Document, vue Jour), **PWA mobile-first**, **tweakable sans coder**.

Pilotage du projet : hub Notion « KVALIA OS — Projet » (architecture, modules, roadmap, Build, ToDo).

## Structure

```
apps/
  web/        PWA Next.js (App Router) — Home + mini-apps
  agent/      serveur MCP « KVALIA OS » + orchestrateur (Claude Agent SDK) + webhooks
packages/
  core/       schémas zod (contrat API + outils), règles métier, types Supabase générés
  ui/         design system : tokens multi-brand × multi-thème, build CSS/TS/Tailwind/Figma (voir packages/ui/DESIGN_SYSTEM.md)
supabase/
  migrations/ schéma Postgres (RLS par user_id dès le départ)
```

## Démarrer

```bash
corepack enable && pnpm install
cp .env.example .env            # puis remplir les clés
pnpm dev                        # web sur :3000, agent sur :8787
```

Base : projet Supabase `kvalia-os` (eu-west-3). Migrations dans `supabase/migrations/`, appliquées avec `supabase db push` (ou via le MCP Supabase). Types : `pnpm db:types`.

## Design system

Source de vérité : `packages/ui/tokens/*.json`. Après modification : `pnpm --filter @kvalia/ui tokens` (régénère CSS, Tailwind, TS, payload Figma et rapport de contraste ; le build échoue si une règle est violée). Spécimen visuel : `packages/ui/specimen/index.html`. Règles et patterns : `packages/ui/DESIGN_SYSTEM.md`.

## Règles du repo

- Les règles métier vivent dans `packages/core` et nulle part ailleurs : l'UI et les outils MCP appellent les mêmes fonctions.
- Un outil MCP = un schéma zod d'entrée + un schéma de sortie dans `packages/core/src/tools.ts`.
- L'UI ne consomme que des tokens sémantiques / de composants (`--kv-bg-*`, `bg-surface`…), jamais de hex ni de primitive.
- Jamais de clé service role côté client. Jamais de secret commité.
- Une phase n'est finie que si son critère de passage est vérifié sur le téléphone, pas en local.
