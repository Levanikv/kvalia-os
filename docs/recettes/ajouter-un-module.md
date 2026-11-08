# Ajouter un module (une application)

1. **Décider** : un module = un usage distinct, une posture UX propre (voir les pages UX Notion / FigJam). Si c'est un sous-ensemble d'une app existante, c'est un **écran**, pas un module.
2. **Registre** `packages/ui/src/index.ts` : entrée dans `modules` (key, label, icon, path, titre, description), ses `onglets` (3–5), position dans `menuApps`. Accent dans `packages/ui/src/tokens.css` (`--accent-<key>`, et le bloc `[data-module="<key>"]`).
3. **Sitemap** `docs/sitemap.md` : section du module, routes, états en query, flux clés.
4. **Données** : migration(s) (recette dédiée), règles et outils dans core (recette dédiée) — **avant** l'UI.
5. **Écrans** : `apps/web/src/app/(app)/<key>/page.tsx` (vue par défaut avec points d'entrée en cartes) + sous-écrans. `ModuleFrame module="<key>"`.
6. **Home** : si le module a quelque chose à dire chaque jour, l'ajouter à `vue_jour` et une `Carte` sur la Home.
7. **Notion** : page UX du module (posture, moments, flux) et tâches Build ; FigJam : flux.
8. **Vérifier / livrer** : `pnpm check`, build web, push, test sur le téléphone, mise à jour du hub Notion.
