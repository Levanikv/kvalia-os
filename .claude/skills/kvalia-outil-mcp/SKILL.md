---

name: kvalia-outil-mcp
description: Ajouter ou modifier un outil MCP de KVALIA OS (contrat zod + règle dans core + test + doc générée + server action). À utiliser dès qu'on veut que l'agent ou l'app puisse faire quelque chose de nouveau.
---

# Ajouter un outil MCP à KVALIA OS

Suis `docs/recettes/ajouter-un-outil.md`. Résumé opérationnel :

1. Lis `packages/core/src/tools.ts` pour le style des descriptions et `docs/outils-agent.md` pour éviter un doublon.
2. Écris la **règle** dans `packages/core/src/<domaine>.ts` (`(db: KvaliaClient, userId: string, …)`, filtre `user_id`, `throw error`).
3. Écris le **test** dans `packages/core/test/<domaine>.test.ts` avec `fausseDb()` / `exercicesRef()` ; lance `pnpm --filter @kvalia/core test`.
4. Ajoute le **contrat** dans `tools.ts` (description pour un LLM : quand l'utiliser, quoi demander avant ; entrée plate ; `.describe()` sur l'ambigu). Lourd / irréversible → `toolsAvecConfirmation`.
5. Ajoute le `case` dans `executer()` (`actions.ts`).
6. `pnpm doc:outils` puis, si l'UI en a besoin, une server action qui appelle `executer()`.
7. `pnpm check`. Commit `feat(<module>): outil <nom> — <pourquoi>`.

Rappels : jour par défaut = `aujourdhuiIso()` ; `Number()` sur les numériques Postgres ; jamais de règle dans `apps/`.
