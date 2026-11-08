# Livrer et vérifier sur le téléphone

1. `pnpm check` vert. Si le web a changé : `pnpm --filter @kvalia/web build`.
2. Commit en français `type(portée): quoi — pourquoi`. Un sujet par commit. Push `main`.
3. Railway : `list-deployments` → `web` et `agent` en `SUCCESS` (2–3 min). Sinon `get-logs`, corriger, re-push. Si rien ne part : `connect-service-source`.
4. Agent : `GET /health` → `outils` = nombre attendu. Nouveaux outils → reconnecter le connecteur claude.ai, puis une phrase réelle.
5. Téléphone : ouvrir l'app installée, recharger, dérouler le parcours réel (pas seulement l'écran modifié). Vérifier la lisibilité à bout de bras, les zones tactiles, le clavier qui ne masque rien.
6. Notion : hub « Où on en est » + page du module si c'est une étape visible. `docs/sitemap.md` si une route a changé.
7. Si ça casse en prod : Railway `rollback` vers le dernier `SUCCESS`, puis corriger au calme.
