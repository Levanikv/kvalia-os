# 0009 — Outillage pour coder avec des agents

**Date** : 8 nov. 2026 · **Statut** : acceptée

## Contexte

Le code est écrit majoritairement par des agents (Claude Code et consorts) sous la direction de Levani. Il faut que chaque agent retrouve le contexte vite, respecte les règles et puisse vérifier son travail sans humain.

## Décision

- **Contexte en couches** : `CLAUDE.md` racine (règles, carte, boucle, commandes) → `CLAUDE.md` par dossier (conventions locales) → `docs/` (architecture, conventions, runbook, glossaire, ADR, recettes). `AGENTS.md` pointe vers `CLAUDE.md` pour les autres outils.
- **Vérifiable** : `pnpm check` = typecheck + lint (Biome pour core/ui/agent, ESLint Next pour web) + tests vitest du noyau (faux client Supabase, fuseau Paris) + doc des outils à jour (`docs/outils-agent.md` générée depuis le contrat). CI GitHub Actions sur chaque push/PR.
- **Recettes activables** : `.claude/skills/` (outil MCP, écran, migration) et `.claude/commands/` (`/verifier`, `/outil`, `/ecran`, `/migration`, `/deployer`) ; sous-agent `verificateur` qui relit un diff contre les règles sans l'avoir écrit.
- **Formatage** : Biome, 160 colonnes, guillemets doubles, point-virgules.

## Conséquences

- Toute règle non vérifiable va dans `docs/conventions.md` ; quand elle devient vérifiable, elle passe dans `pnpm check`.
- Un ajout d'outil sans régénérer la doc casse la CI : la doc ne dérive plus.
- Les décisions sont écrites : un agent ne les rediscute pas, il propose un nouvel ADR.
