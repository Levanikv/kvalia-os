# apps/web — la PWA

Next.js 16 (App Router), React 19, Tailwind 4. Mobile-first (max-w-lg centré), installable (manifest, icônes), temps réel Supabase.

## Structure

- `src/app/(app)/<module>/…` — un dossier par module (préfixe d'URL = module, voir `docs/sitemap.md`). `page.tsx` = server component qui charge les données ; les interactions sont des **client components** (`"use client"`) à côté ; les écritures passent par **server actions** (`actions.ts`, `"use server"`) qui appellent `executer()` de core.
- `src/app/(app)/layout.tsx` — shell : `Fab` (+ Capture) et `ModuleBar` (barre inférieure de l'app courante).
- `src/components/` — `ModuleFrame` (header : menu apps / retour, titre, avatar, barre), `BottomSheet` (feuille modale), `BandeJours` (jours scrollables), `Carte`, `EntreeCarte` (dans sport/), `Icon` (Material Symbols Rounded, ligatures), `RealtimeRefresh` (refresh sur changement de tables), `Placeholder` (écran à venir).
- `src/lib/session.ts` — `session()` (supabase SSR + user, redirige sinon), `aujourdhui()` (Europe/Paris).
- `src/lib/supabase/` — clients SSR/navigateur, `proxy.ts` (Next 16 : remplace middleware).
- `src/app/globals.css` — mapping tokens → classes Tailwind (`bg-surface`, `text-text-2`, `bg-accent`, `bg-accent-soft`…), animations des feuilles, bande de jours.

## Conventions UI

- **Points d'entrée en cartes** : chaque niveau important propose des `EntreeCarte` (icône, titre, un chiffre, une ligne de contexte) vers ses sous-modules.
- **Feuilles, pas de modales** : tout ce qui est contextuel s'ouvre dans `BottomSheet` (confirmation, détail, choix).
- **Navigation** : pas de tab bar globale. `MenuApps` (burger) liste les apps ; `ModuleBar` affiche les `onglets` de l'app courante (`packages/ui`). Un écran de détail passe `gauche={<flèche retour>}` à `ModuleFrame`.
- **Accent par module** : `data-module` est posé par `ModuleFrame` ; utilise `text-accent` / `bg-accent` / `bg-accent-soft`, jamais une couleur en dur (sauf sémantique : succès, danger).
- **Dates** : `?jour=YYYY-MM-DD` en query ; `jourDepuis(param, aujourdhui())` ; affichage via `toLocaleDateString("fr-FR", …)`.
- **Optimiste** : `useOptimistic` + `useTransition` pour cocher / modifier ; `router.refresh()` après une action qui change d'autres écrans. `RealtimeRefresh` pour ce qui vient de l'agent.
- **Textes** : français, tutoiement, courts. Pas d'anglais sauf noms propres. `nomAffiche()` pour les exercices.
- **Pas de `<img>` externe non protégé** côté perf : `loading="lazy"` ; vidéos `muted loop playsInline autoPlay preload="metadata"`.

## Vérifier

`pnpm --filter @kvalia/web typecheck && pnpm --filter @kvalia/web lint && pnpm --filter @kvalia/web build` (le build a besoin des deux variables `NEXT_PUBLIC_*`, voir `.env.example`). Puis tester sur l'iPhone après déploiement.
