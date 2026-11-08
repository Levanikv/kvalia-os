# apps/agent — le serveur MCP

Hono + `@modelcontextprotocol/sdk` (`WebStandardStreamableHTTPServerTransport`, stateless). Lancé avec `tsx` (pas de build). Hébergé sur Railway (`agent-production-b5d9.up.railway.app`).

- `src/server.ts` enregistre **tous** les outils de `@kvalia/core` (`tools`) en boucle : tu n'ajoutes jamais un outil ici, uniquement dans core. Les outils de `toolsAvecConfirmation` portent `destructiveHint: true`.
- Auth v0 : le token est dans l'URL (`/mcp/<MCP_TOKEN>`) ; `/mcp` sans token → 404. OAuth viendra avec le multi-utilisateur (ADR 0005).
- Contexte : `KVALIA_USER_ID` = l'unique utilisateur ; client Supabase **service role** (`SUPABASE_SERVICE_ROLE_KEY`) → les règles de core filtrent sur `user_id`.
- `/health` renvoie `{ ok, node, outils }`. Les erreurs PostgREST sont formatées (`messageErreur`).
- `scripts/smoke.mjs` : appelle chaque outil en local (lit `.env`). `scripts/seed-exercices.mjs` : upsert du référentiel d'exercices (service role).
- Variables : voir `.env.example`. Le `.env` racine est chargé par `process.loadEnvFile` en local ; en prod, Railway fournit les variables.
- Après un push, Railway redéploie ; si le déploiement ne part pas, `connect-service-source` (MCP Railway) le relance. Vérifie `/health` et `list-deployments`.
