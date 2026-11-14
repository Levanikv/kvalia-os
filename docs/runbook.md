# Runbook — faire tourner, déployer, réparer

## Environnements

|       | Où                                                                       | Identifiants                                                     |
| ----- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Base  | Supabase, projet `gspidvxtnmtgifnlgcsu` (eu-west-3)                      | Dashboard Supabase ; MCP Supabase dans claude.ai                 |
| Web   | Railway service `web` → `https://web-production-fc414.up.railway.app`    | Railway projet `kvalia-os` (5cd96854…), env `production`         |
| Agent | Railway service `agent` → `https://agent-production-b5d9.up.railway.app` | idem ; connecteur claude.ai « KVALIA OS » sur `/mcp/<MCP_TOKEN>` |
| Code  | GitHub `Levanikv/kvalia-os`, branche `main`                              | GitHub App Railway installée → push = déploiement                |

Un seul environnement (prod) en v1. On teste sur le téléphone avec les vraies données ; les règles sont testées hors-ligne (`pnpm test`).

## Local

```bash
nvm use                       # Node 22 (Node 20 → erreurs 500)
corepack enable && pnpm install
cp .env.example .env          # remplir : clés Supabase, KVALIA_USER_ID, MCP_TOKEN (openssl rand -hex 24)
ln -s ../../.env apps/web/.env.local
pnpm env:verifier
pnpm dev                      # web :3000, agent :8787
pnpm --filter @kvalia/agent smoke   # appelle chaque outil MCP en local
```

Le dépôt est cloné dans `~/Developer/kvalia-os` sur la machine de Levani. Un serveur orphelin sur :8787 → `pkill -f src/server.ts`.

## Vérifier avant de livrer

```bash
pnpm check                                  # typecheck + lint + tests + doc des outils à jour
pnpm --filter @kvalia/web build             # si le web a changé (variables NEXT_PUBLIC_* requises)
```

## Déployer

Push sur `main`. Railway construit `web` et `agent` (≈ 2–3 min). Vérifier :

- MCP Railway `list-deployments` → les deux en `SUCCESS` ; `get-logs` en cas d'échec.
- `GET https://agent-production-b5d9.up.railway.app/health` → `{ ok: true, outils: N }`.
- L'app sur l'iPhone (recharger ; la PWA n'a pas encore de service worker, donc pas de cache à purger).

Si un push ne déclenche rien : MCP Railway `connect-service-source` (repo `Levanikv/kvalia-os`, branche `main`) sur le service concerné. Pour relancer sans push : `redeploy`.

Config de build : `railpack.json` (racine, agent) et `apps/web/railpack.json` (web : `pnpm --filter @kvalia/web build` puis `start` ; `RAILPACK_CONFIG_FILE=apps/web/railpack.json` dans les variables du service web). Healthcheck web `/connexion`.

## Base de données

- **Migration** : écrire `supabase/migrations/YYYYMMDDHHMMSS_nom.sql`, l'appliquer (MCP Supabase `apply_migration` avec le même nom, ou `pnpm db:push`), régénérer les types (`pnpm db:types` ou MCP `generate_typescript_types` → `packages/core/src/database.types.ts`), committer les deux.
- **Realtime** : `alter publication supabase_realtime add table public.<table>; alter table public.<table> replica identity full;`
- **Seed des exercices** : `pnpm --filter @kvalia/agent seed:exercices` (service role, upsert par lots de 100). Vérifier : `select count(*) from exercices_ref` = 317.
- **Programme sans réseau** : `pnpm --filter @kvalia/core exec tsx scripts/programme-sql.ts <user_id> <lundi ISO> [poids]` → SQL dans `/tmp/prog-*.sql`, à exécuter via MCP Supabase `execute_sql`.
- **Inspecter** : MCP Supabase `execute_sql` (lecture) ; `get_advisors` pour la sécurité/perf après une migration.

## Variables d'environnement

Voir `.env.example`. Côté Railway : `web` a les deux `NEXT_PUBLIC_*` + `PORT=3000` + `RAILPACK_CONFIG_FILE` ; `agent` a `SUPABASE_*`, `KVALIA_USER_ID`, `MCP_TOKEN`, `PORT=8787`, `KVALIA_TZ` (optionnel, défaut Europe/Paris). Modifier une variable → `set-variables` puis redéploiement automatique.

Rotation du `MCP_TOKEN` : nouvelle valeur dans Railway, puis mettre à jour l'URL du connecteur dans claude.ai (Réglages → Connecteurs).

## Tiime (Entreprise, ADR 0010)

- Variables du service **agent** uniquement : `TIIME_EMAIL`, `TIIME_PASSWORD` (à saisir par Levani dans Railway, jamais dans le chat ni dans un commit), `TIIME_SOCIETE_ID=626568`, `TIIME_APP_VERSION` (optionnel).
- Le compte a la double authentification (SMS). **Première connexion** en local : `pnpm --filter @kvalia/agent tiime:connexion` (le code se tape dans le terminal, puis une synchro tourne). Le jeton de rafraîchissement est stocké dans `connexions_externes` (RLS sans politique : service role seulement), donc l'agent Railway en profite sans nouveau code.
- **Reconnexion depuis le téléphone** : dans claude.ai, « reconnecte Tiime » → `connecter_tiime` (SMS) → donner le code → `valider_code_tiime`. Le parcours SMS vit en mémoire du processus agent : un redéploiement entre les deux étapes oblige à recommencer.
- Synchro : outil `synchroniser_tiime` (lecture seule ; relancer est sans risque, upsert sur l'identifiant Tiime). Chiffres : `pilotage_sasu`.

## Pannes connues

| Symptôme                                            | Cause                                 | Remède                                             |
| --------------------------------------------------- | ------------------------------------- | -------------------------------------------------- |
| `Internal Server Error` en local sur l'agent        | Node 20                               | `nvm use`                                          |
| L'app affiche hier à 00:30                          | date UTC                              | utiliser `aujourdhui()` / `aujourdhuiIso()`        |
| Le connecteur claude.ai ne voit pas un nouvel outil | cache de la liste d'outils            | reconnecter le connecteur ou nouvelle conversation |
| `No start command detected` sur Railway             | pas de `railpack.json` au bon endroit | voir Config de build                               |
| `vue_jour` vide côté agent                          | `auth.uid()` null avec service role   | passer `p_user_id`                                 |
| Push sans déploiement                               | GitHub App pas liée au service        | `connect-service-source`                           |
| Outil Tiime : `mfa_requis` / `connexion_refusee`    | jeton de rafraîchissement expiré      | `connecter_tiime` puis `valider_code_tiime`        |
| Synchro Tiime : avertissement 404 ou 403            | Tiime a changé son API interne        | comparer avec eko/mcp-tiime `docs/api-tiime.md`    |

## Sauvegardes et retour arrière

- Railway : `list-deployments` → `rollback` vers le dernier `SUCCESS`.
- Supabase : sauvegardes quotidiennes du plan ; avant une migration destructive, `execute_sql` d'un `create table … as select` de secours.
- Un programme sportif régénéré remplace les séances non faites de l'ancien **à partir de son premier jour** (celle du jour comprise si le nouveau démarre aujourd'hui) ; avant cette date l'ancien continue, et les séances faites sont conservées par construction (jamais doublées).
- Une séance ne se démarre que le jour J (`peutDemarrer`) : démarrer, cocher, valider une série ou terminer une séance prévue un autre jour est refusé par le noyau.
