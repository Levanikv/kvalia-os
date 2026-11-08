---

## description: Crée ou modifie un écran de la PWA. Usage — /ecran <route> : <ce que l'écran montre et permet>

Utilise la skill `kvalia-ecran` pour `$ARGUMENTS`. Commence par la ligne à ajouter dans `docs/sitemap.md` et, si c'est une entrée principale, l'onglet dans `packages/ui`. Les écritures passent par des server actions → `executer()`. Finis par typecheck + lint + build web, puis `pnpm check`.
