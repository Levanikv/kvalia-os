---

name: kvalia-ecran
description: Créer ou modifier un écran de la PWA KVALIA OS (page Next.js App Router, ModuleFrame, cartes d'entrée, BottomSheet, server actions via executer). À utiliser pour toute page, feuille ou composant dans apps/web.
---

# Écran KVALIA OS

Suis `docs/recettes/ajouter-un-ecran.md` et `apps/web/CLAUDE.md`. Résumé :

- Route d'abord dans `docs/sitemap.md` ; entrée principale → `onglets` dans `packages/ui/src/index.ts`.
- `page.tsx` = server component async : `const { supabase, user } = await session();`, lectures en `Promise.all`, `params`/`searchParams` sont des Promises.
- `<ModuleFrame module=… titre sousTitre gauche barre>` ; écran de détail → `gauche={<Link … aria-label="Retour"><Icon name="arrow_back" size={24} /></Link>}`.
- Sous-niveaux en `EntreeCarte` (icône, titre, chiffre, ligne de contexte). Contextuel en `BottomSheet`. Jours en `BandeJours` + `?jour=`.
- Écritures : server action (`actions.ts`, `"use server"`) → `executer(nom, entree, { db: supabase, userId: user.id })` → `revalidatePath`. Jamais d'écriture Supabase directe dans web.
- Interactions : client component minimal, `useOptimistic` + `useTransition`, `router.refresh()` quand d'autres écrans changent. `RealtimeRefresh` si l'agent peut modifier la donnée.
- Tokens Tailwind (`bg-surface-2`, `text-accent`, `bg-accent-soft`), `.tap` ≥ 44 px, textes FR tutoyés, états vides utiles.
- Vérifier : `pnpm --filter @kvalia/web typecheck && pnpm --filter @kvalia/web lint && pnpm --filter @kvalia/web build` puis `pnpm check`.
