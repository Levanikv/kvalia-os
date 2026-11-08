# 0001 — Mono-repo pnpm + turbo, Next.js + Hono + Supabase

**Date** : 7 nov. 2026 · **Statut** : acceptée

## Contexte

Un seul développeur (Levani, designer) assisté d'agents de code. Il faut partager types et règles entre une app web et un serveur MCP sans publier de paquets.

## Décision

- Mono-repo **pnpm workspaces + turbo** : `apps/web` (Next.js 16 App Router), `apps/agent` (Hono + MCP SDK), `packages/core`, `packages/ui`, `supabase/`.
- TypeScript strict partout, Node 22, pas de build pour l'agent (`tsx`).
- Tailwind 4 + composants maison (pas de UI kit).

## Conséquences

- Un changement de schéma se propage par les types générés ; une règle n'est écrite qu'une fois.
- Les agents de code voient tout le contexte dans un seul dépôt.
- Il faut un `pnpm check` rapide pour garder le mono-repo sain (voir 0009).
