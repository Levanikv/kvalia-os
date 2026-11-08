# Ajouter un outil MCP

Exemple fil rouge : `noter_charge` (noter les kg soulevés sur un exercice).

1. **Nommer** : français, `snake_case`, verbe ou nom clair (`noter_charge`, `seance_du_jour`). Vérifie dans `docs/outils-agent.md` qu'il n'existe pas déjà quelque chose de proche à enrichir.
2. **Règle** dans `packages/core/src/<domaine>.ts` : `export async function noterCharge(db: KvaliaClient, userId: string, …)`. Filtre sur `user_id`, relance les erreurs, retourne un objet simple.
3. **Test** dans `packages/core/test/<domaine>.test.ts` avec `fausseDb()` (+ `exercicesRef()` si besoin). Cas nominal + un cas limite. `pnpm --filter @kvalia/core test`.
4. **Contrat** dans `packages/core/src/tools.ts` : `description` écrite pour un LLM (quand l'utiliser, ce qu'il faut demander avant), `input` zod plat avec `.describe()` sur les champs ambigus, `output` zod. Lourd / irréversible → `toolsAvecConfirmation`.
5. **Implémentation** dans `packages/core/src/actions.ts` : un `case "noter_charge"` qui parse l'entrée typée et appelle la règle.
6. **Doc** : `pnpm doc:outils` (régénère `docs/outils-agent.md`).
7. **App** (si l'UI en a besoin) : server action dans `apps/web/src/app/(app)/<module>/actions.ts` → `executer("noter_charge", …, { db: supabase, userId: user.id })` + `revalidatePath` des écrans touchés. Puis le composant.
8. **Vérifier** : `pnpm check`. L'agent (`apps/agent`) expose l'outil automatiquement.
9. **Livrer** : commit `feat(<module>): outil noter_charge — …`, push. Dans claude.ai, reconnecter le connecteur « KVALIA OS » pour voir le nouvel outil. Tester une phrase réelle.

Pièges : oublier `aujourdhuiIso()` pour un jour par défaut ; retourner des `Decimal` Postgres sans `Number()` ; une description qui dit _comment_ au lieu de _quand_.
