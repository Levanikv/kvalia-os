# apps/web — la PWA

Next.js 16 (App Router), React 19, Tailwind 4. Mobile-first (max-w-lg centré), installable (manifest, icônes), temps réel Supabase.

## Structure

- `src/app/(app)/<module>/…` — un dossier par module (préfixe d'URL = module, voir `docs/sitemap.md`). `page.tsx` = server component qui charge les données ; les interactions sont des **client components** (`"use client"`) à côté ; les écritures passent par **server actions** (`actions.ts`, `"use server"`) qui appellent `executer()` de core.
- `src/app/(app)/layout.tsx` — shell : `Fab` (+ Capture) et `ModuleBar` (barre inférieure de l'app courante).
- `src/components/` — `ModuleFrame` (header : menu apps / retour, titre, avatar, barre), `BottomSheet` (feuille modale), `BandeJours` (jours scrollables), `Carte`, `EntreeCarte` (dans sport/), `Icon` (Material Symbols Rounded, ligatures), `RealtimeRefresh` (refresh sur changement de tables), `Placeholder` (écran à venir).
- `src/lib/session.ts` — `session()` (supabase SSR + user, redirige sinon), `aujourdhui()` (Europe/Paris).
- `src/lib/supabase/` — clients SSR/navigateur, `proxy.ts` (Next 16 : remplace middleware).
- `src/app/globals.css` — importe le pont Tailwind généré du design system (`@kvalia/ui/tailwind.css`), rayons `sm|md|lg` → rôles du DS, constantes du shell (`--tabbar-h`, `--header-h`), Sport sombre, animations des feuilles (durées/courbes du DS), bande de jours.

## Conventions UI

- **Points d'entrée en cartes** : chaque niveau important propose des `EntreeCarte` (icône, titre, un chiffre, une ligne de contexte) vers ses sous-modules.
- **Feuilles, pas de modales** : tout ce qui est contextuel s'ouvre dans `BottomSheet` (confirmation, détail, choix).
- **Navigation** : pas de tab bar globale. `MenuApps` (burger) liste les apps ; `ModuleBar` affiche les `onglets` de l'app courante (`packages/ui`). Un écran de détail passe `gauche={<flèche retour>}` à `ModuleFrame`.
- **Design system** (Figma « Kvalia Design System », voir `packages/ui/DESIGN_SYSTEM.md`) : `data-module` est posé par `ModuleFrame` et sélectionne la palette Brand du module. Surfaces `bg-surface-canvas|default|sunken`, textes `text-fg-primary|secondary|tertiary`, bordures `border-line-default|subtle`, action `bg-action-primary` **toujours avec** `text-fg-on-brand` (jamais `text-white` : le texte sur primary est foncé sauf Entreprise), texte de marque `text-fg-brand`, fond teinté `bg-surface-brand-subtle`, statuts `bg-feedback-*` / `text-feedback-*-text`. Typo : classes `.type-*`. Jamais de couleur en dur.
- **Dates** : `?jour=YYYY-MM-DD` en query ; `jourDepuis(param, aujourdhui())` ; affichage via `toLocaleDateString("fr-FR", …)`.
- **Optimiste** : `useOptimistic` + `useTransition` pour cocher / modifier ; `router.refresh()` après une action qui change d'autres écrans. `RealtimeRefresh` pour ce qui vient de l'agent.
- **Textes** : français, tutoiement, courts. Pas d'anglais sauf noms propres. `nomAffiche()` pour les exercices.
- **Pas de `<img>` externe non protégé** côté perf : `loading="lazy"` ; vidéos `muted loop playsInline autoPlay preload="metadata"`.

## Vérifier

`pnpm --filter @kvalia/web typecheck && pnpm --filter @kvalia/web lint && pnpm --filter @kvalia/web build` (le build a besoin des deux variables `NEXT_PUBLIC_*`, voir `.env.example`). Puis tester sur l'iPhone après déploiement.
