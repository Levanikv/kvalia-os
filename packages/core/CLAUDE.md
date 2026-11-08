# packages/core — le noyau

Tout ce qui est une **règle** vit ici. L'app (`apps/web`) et l'agent (`apps/agent`) ne font qu'appeler.

## Fichiers

- `src/tools.ts` — **contrat** : `tools = { nom: { description, input: zod, output: zod } }` + `toolsAvecConfirmation`. Noms en français, `snake_case`, verbe à l'infinitif ou nom (`ajouter_produit`, `seance_du_jour`). Descriptions écrites pour un LLM : quand l'utiliser, ce que ça fait, ce qu'il faut demander avant.
- `src/actions.ts` — `executer(nom, entree, ctx)` : un `case` par outil, qui appelle une fonction de règle. `resoudreDate()`, `aujourdhuiIso()`, `FUSEAU`.
- `src/sport.ts` — paramètres (`ParametresSport`), générateur (`genererProgramme`), suivi (`cocherExercice`, `terminerSeance`), charges (`noterCharge`, `historiqueCharge`, `dernieresCharges`), remplacement (`equivalents`, `remplacerExercice`), kcal (`kcalPour`, `poidsActuel`), libellés FR (`LIBELLES`).
- `src/nutrition.ts` — `ParametresNutrition`, `bilanJour` (base + kcal sport → cible).
- `src/schemas.ts` — schémas partagés (VueJour, Ligne, Tache…).
- `src/supabase.ts` — `KvaliaClient`, `createServiceClient`.
- `src/database.types.ts` — **généré** (`pnpm db:types`), ne pas éditer.
- `test/fausse-db.ts` — faux client Supabase en mémoire + `exercicesRef()` (317 exos du seed). Étends-le si une règle utilise une méthode PostgREST qu'il ne couvre pas.
- `scripts/` — `doc-outils.ts` (génère `docs/outils-agent.md`), `essai-generateur.ts`, `programme-sql.ts` (programme → SQL quand pas de réseau).

## Règles locales

- Une fonction de règle prend `(db: KvaliaClient, userId: string, …)` et **filtre toujours sur `user_id`** même si RLS le fait déjà (le client service role ne l'a pas).
- Les erreurs PostgREST sont relancées (`if (error) throw error`) ; pas de `console.log` dans `src/`.
- Pas d'import de `next`, `react` ou `hono` ici : core est agnostique.
- Un ajout d'outil = contrat + `case` + test + `pnpm doc:outils`. La CI échoue si la doc n'est pas régénérée.
- Chaque règle non triviale a un test dans `test/*.test.ts` (vitest, fuseau Europe/Paris forcé).
