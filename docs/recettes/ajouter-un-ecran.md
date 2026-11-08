# Ajouter un écran

Exemple fil rouge : `/sport/historique`.

1. **Sitemap** : ajoute la route dans `docs/sitemap.md` (préfixe = module, états/dates en query). Si c'est une entrée principale de l'app, ajoute-la aux `onglets` du module dans `packages/ui/src/index.ts` (max 5).
2. **Page** : `apps/web/src/app/(app)/<module>/<ecran>/page.tsx`, server component `async`. `const { supabase, user } = await session();` puis les lectures (directes pour l'affichage, `Promise.all`). Dates via `aujourdhui()` / `jourDepuis()`.
3. **Cadre** : `<ModuleFrame module="sport" titre="…" sousTitre="…" gauche={flèche retour si écran de détail} barre={…}>`. Points d'entrée en `EntreeCarte` si l'écran a des sous-niveaux.
4. **Interactions** : client component à côté (`Historique.tsx`, `"use client"`) ; écritures via server actions qui appellent `executer()` (jamais `supabase.from(...).update` dans le web). Contextuel → `BottomSheet`. Optimiste → `useOptimistic` + `useTransition`.
5. **Temps réel** : `<RealtimeRefresh tables={["seances"]} />` si l'agent peut changer ce que l'écran montre.
6. **Textes** : français, tutoiement, états vides utiles. Icônes Material Symbols par ligature.
7. **Vérifier** : `pnpm --filter @kvalia/web typecheck && pnpm --filter @kvalia/web lint && pnpm --filter @kvalia/web build`, puis `pnpm check`.
8. **Livrer** et ouvrir l'écran sur l'iPhone (installé) : lisibilité à bout de bras, cibles ≥ 44 px, zone sûre en bas.

Pièges : `searchParams` et `params` sont des **Promises** (Next 16) ; une page qui lit `?jour=` doit valider le format ; un `Link` dans un `button` (ou l'inverse) est invalide — sépare les zones tactiles comme dans `Checklist`.
