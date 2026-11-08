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
  ui/         design system (tokens, composants) exporté depuis Figma
supabase/
  migrations/ schéma Postgres (RLS par user_id dès le départ)
```

## Démarrer

```bash
corepack enable && pnpm install
cp .env.example .env
ln -s ../../.env apps/web/.env.local   # Next.js lit le .env de son propre dossier            # puis remplir les clés
pnpm dev                        # web sur :3000, agent sur :8787
```

Base : projet Supabase `kvalia-os` (eu-west-3). Migrations dans `supabase/migrations/`, appliquées avec `supabase db push` (ou via le MCP Supabase). Types : `pnpm db:types`.

## Travailler avec des agents

Le dépôt est pensé pour être codé avec des agents : **[`CLAUDE.md`](./CLAUDE.md)** (règles, carte, boucle de travail, commandes), `CLAUDE.md` par dossier, et `docs/` :
[architecture](docs/architecture.md) · [conventions](docs/conventions.md) · [runbook](docs/runbook.md) · [glossaire](docs/glossaire.md) · [décisions (ADR)](docs/decisions/) · [recettes](docs/recettes/) · [outils de l'agent](docs/outils-agent.md) (généré) · [sitemap](docs/sitemap.md).
Skills et commandes Claude Code dans `.claude/` (`/verifier`, `/outil`, `/ecran`, `/migration`, `/deployer`, sous-agent `verificateur`).

```bash
pnpm check   # typecheck + lint + tests + doc des outils à jour — à passer avant tout push
```

## Règles du repo

- Les règles métier vivent dans `packages/core` et nulle part ailleurs : l'UI et les outils MCP appellent les mêmes fonctions.
- Un outil MCP = un schéma zod d'entrée + un schéma de sortie dans `packages/core/src/tools.ts`.
- Jamais de clé service role côté client. Jamais de secret commité.
- Une phase n'est finie que si son critère de passage est vérifié sur le téléphone, pas en local.
