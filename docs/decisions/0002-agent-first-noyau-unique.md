# 0002 — Agent-first : un noyau, un contrat d'outils

**Date** : 7 nov. 2026 · **Statut** : acceptée

## Contexte

L'utilisateur agit autant par la voix / claude.ai que par l'app. Deux chemins = deux implémentations qui divergent.

## Décision

- Chaque capacité est un **outil** : schéma zod d'entrée et de sortie dans `packages/core/src/tools.ts`, implémentation dans `executer()` (`actions.ts`) qui appelle des fonctions de règle (`sport.ts`, `nutrition.ts`…).
- L'app appelle `executer()` dans ses server actions ; le serveur MCP expose `tools` en boucle. **Aucune règle dans `apps/`.**
- Les outils lourds ou irréversibles sont listés dans `toolsAvecConfirmation` (l'agent demande avant ; `destructiveHint`).
- La doc des outils est générée (`docs/outils-agent.md`) et vérifiée en CI.

## Conséquences

- Ajouter une fonctionnalité = ajouter un outil d'abord, l'écran ensuite.
- Les règles sont testables sans UI ni réseau (faux client).
- Les pages peuvent lire directement la base pour l'affichage (lecture pure), mais n'écrivent jamais sans passer par un outil.
