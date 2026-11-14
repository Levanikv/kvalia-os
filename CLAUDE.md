# KVALIA OS — guide pour les agents de code

Tu travailles sur **KVALIA OS**, le « life OS » personnel de Levani : une PWA mobile-first (Next.js) + un agent MCP, sur Supabase.
Un seul utilisateur en v0/v1. Tout est en **français** (code, commits, docs, UI). Lis ce fichier en entier, puis seulement ce dont la tâche a besoin dans `docs/`.

## Les 6 règles (non négociables)

1. **Agent-first.** Toute action de l'UI est d'abord un outil MCP : schéma zod dans `packages/core/src/tools.ts`, implémentation dans `packages/core/src/actions.ts` (via `executer()`). L'app appelle `executer()` dans ses server actions ; l'agent expose le même contrat. **Jamais de règle métier dans `apps/`.**
2. **Un noyau.** Les règles (génération de programme, kcal, remplacement, dates…) vivent dans `packages/core/src/*.ts`, testées avec le faux client (`packages/core/test/fausse-db.ts`). Si tu touches une règle, tu touches son test.
3. **RLS partout.** Chaque table a `user_id` + politiques owner. Côté web on utilise le client SSR (clé publique, cookies) ; la clé service role n'existe que dans `apps/agent` et les scripts. Aucun secret commité.
4. **Dates calendaires côté utilisateur.** Le serveur tourne en UTC ; « aujourd'hui » = `aujourdhuiIso()` (Europe/Paris). Jamais `new Date().toISOString().slice(0,10)` pour un jour utilisateur.
5. **Source de vérité du routing** : `docs/sitemap.md`. Un module = un préfixe d'URL = un accent (`data-module`). Nouvelle route → sitemap mis à jour dans le même commit.
6. **Vérifié sur le téléphone.** Une fonctionnalité est finie quand elle marche dans l'app installée sur l'iPhone, pas en local. `pnpm check` doit passer avant tout push.

## Carte du repo

```
apps/web        PWA Next.js 16 (App Router, React 19, Tailwind 4). Pages = server components, interactions = client components + server actions.
apps/agent      Serveur MCP (Hono + @modelcontextprotocol/sdk, stateless, tsx). Expose `tools` de core. /mcp/<MCP_TOKEN>. Hébergé sur Railway.
packages/core   Contrat (tools.ts, schemas.ts), règles (actions.ts, sport.ts, nutrition.ts), clients Supabase, database.types.ts (généré).
packages/ui     Registre des modules + navigation (index.ts), design system généré depuis Figma (tokens/, src/tokens.css, src/tailwind.css — voir DESIGN_SYSTEM.md).
supabase/       migrations/ (SQL, appliquées au projet distant), seed/ (référentiel d'exercices).
docs/           sitemap, architecture, conventions, runbook, glossaire, décisions (ADR), recettes pas-à-pas, outils-agent (généré).
.claude/        skills (recettes activables), commands (/verifier, /outil, /ecran, /migration, /deployer), agents (vérificateur).
```

## Boucle de travail

1. **Comprendre** : relis la recette qui correspond (`docs/recettes/`), le module concerné dans `docs/sitemap.md`, et la décision (ADR) si elle existe. Ne redécide pas ce qui est tranché dans `docs/decisions/`.
2. **Noyau d'abord** : schéma zod → règle dans core → test vitest (faux client) → `pnpm --filter @kvalia/core test`.
3. **Outil** : ajoute l'outil dans `tools.ts` + `actions.ts` ; si l'action est lourde/irréversible, ajoute-le à `toolsAvecConfirmation`. Puis `pnpm doc:outils`.
4. **UI** : server action qui appelle `executer()`, page/server component, client component minimal. Composants partagés dans `apps/web/src/components` (`ModuleFrame`, `BottomSheet`, `BandeJours`, `Carte`, `Icon`…). Respecte `docs/conventions.md`.
5. **Vérifier** : `pnpm check` (typecheck + lint + tests + doc à jour), puis `pnpm --filter @kvalia/web build` si tu as touché le web.
6. **Livrer** : commit en français au format `type(portée): quoi — pourquoi` (feat, fix, chore, docs, refactor, test). Push sur `main` → Railway déploie `web` et `agent` automatiquement. Mets à jour Notion (hub + page du module) si c'est une étape visible.

## Commandes

| Quoi                            | Commande                                                          |
| ------------------------------- | ----------------------------------------------------------------- |
| Tout vérifier                   | `pnpm check`                                                      |
| Types / tests / lint            | `pnpm typecheck` · `pnpm test` · `pnpm lint`                      |
| Formater                        | `pnpm format` (Biome)                                             |
| Dev local                       | `pnpm dev` (web :3000, agent :8787) — Node 22 (`nvm use`)         |
| Smoke MCP local                 | `pnpm --filter @kvalia/agent smoke`                               |
| Régénérer la doc des outils     | `pnpm doc:outils`                                                 |
| Types Supabase                  | `pnpm db:types` (ou MCP Supabase `generate_typescript_types`)     |
| Essai du générateur sans réseau | `pnpm --filter @kvalia/core exec tsx scripts/essai-generateur.ts` |
| Vérifier le .env                | `pnpm env:verifier`                                               |

## Ce que tu ne fais pas

- Pas de nouvelle dépendance lourde (UI kit, ORM, state manager) sans ADR. Tailwind + composants maison suffisent.
- Pas de `any` dans `src/` (autorisé dans `test/` et `scripts/`). Pas de `// eslint-disable` sans raison écrite.
- Pas de migration appliquée « à la main » sans fichier dans `supabase/migrations/` (horodaté `YYYYMMDDHHMMSS_nom.sql`).
- Pas de texte anglais dans l'UI. Les noms d'exercices du référentiel sont en anglais : passe par `nomAffiche()` / `nom_fr`.
- Pas de modale centrée : feuilles qui montent du bas (`BottomSheet`). Pas de tab bar globale : menu « Applications » + barre par app (`packages/ui`).
- Pas d'élément caché par l'iPhone : en-têtes sous `env(safe-area-inset-top)` (barre d'état, Dynamic Island), tout ce qui est fixé en bas au-dessus de `env(safe-area-inset-bottom)` entier (indicateur d'accueil), contenu qui défile avec la marge correspondante. Détail : `docs/conventions.md` § UI « Zones sûres iPhone ».

## Contexte produit (résumé)

Modules : Home (vue Jour) · Quotidien (courses, tâches, habitudes) · Sport & Nutrition (programme généré, séances à cocher, kcal → cible du jour) · Finances (perso) · Entreprise (SASU) · Documents · Objectifs · Réglages · Capture (parler à l'agent).
Pilotage : hub Notion « KVALIA OS — Projet » (roadmap, tâches Build, pages UX par module). FigJam : flux UX. Infra : Supabase `gspidvxtnmtgifnlgcsu` (eu-west-3), Railway projet `kvalia-os` (services `web`, `agent`, région EU), repo `Levanikv/kvalia-os`.

Détails : `docs/architecture.md` · `docs/conventions.md` · `docs/runbook.md` · `docs/glossaire.md` · `docs/decisions/` · `docs/recettes/` · `docs/outils-agent.md`.
