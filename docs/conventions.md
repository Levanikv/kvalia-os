# Conventions

Ce qui n'est pas vérifié par `pnpm check` (types, lint, tests, doc des outils) est ici. Quand une convention devient vérifiable, on l'automatise et on la retire de ce fichier.

## Langue et nommage

- **Français partout** : identifiants, commentaires, commits, UI, docs. Anglais toléré pour les termes techniques établis (`props`, `hook`, `server action`) et les noms d'exercices du référentiel (affichés via `nomAffiche()`).
- Variables et fonctions : `camelCase` (`genererProgramme`, `seanceDuJour`). Types et composants : `PascalCase` (`ParametresSport`, `BottomSheet`). Constantes de configuration : `MAJUSCULES` (`PARAMETRES_SPORT_DEFAUT`, `LIBELLES`).
- Base et outils MCP : `snake_case` (`exercices_seance`, `cocher_exercice`). Enums en base : valeurs en français sans accent (`prevue`, `en_cours`, `faite`).
- Fichiers : composants React `PascalCase.tsx` ; le reste `kebab-case.ts` ou le nom imposé par Next (`page.tsx`, `layout.tsx`, `actions.ts`).
- Pas d'accents dans les identifiants (`duree`, `seance`, `etat`), mais oui dans les chaînes affichées et les commentaires.

## Code

- **TypeScript strict**, pas de `any` dans `src/`. Un `as` doit être justifié par la ligne au-dessus (ex. jsonb typé).
- **zod** pour tout ce qui entre (outils, formulaires, `reglages` jsonb) : `Schema.parse()` côté serveur, `safeParse()` quand une valeur par défaut est acceptable.
- Les **règles métier** sont des fonctions pures ou `(db, userId, …) => Promise`. Pas de classe, pas de singleton.
- **Erreurs** : on relance (`throw error`) ; le serveur MCP et les server actions formatent. Pas de `try/catch` qui avale.
- **Dates** : `jour` est une chaîne `YYYY-MM-DD` (calendaire) ; les horodatages sont des ISO complets. Décaler un jour = `decaler(jour, n)` (UTC midi) pour éviter les sauts d'heure d'été. « Aujourd'hui » = `aujourdhuiIso()` (core) / `aujourdhui()` (web).
- **Imports** : chemins `@/` dans web ; `@kvalia/core` et `@kvalia/ui` entre paquets ; jamais de chemin relatif qui sort d'un paquet.
- **Commentaires** : un en-tête de fichier qui dit à quoi il sert et pour qui ; des commentaires sur le _pourquoi_, pas le _quoi_.

## Base de données

- Toute table : `id uuid default gen_random_uuid()`, `user_id`, `created_at` (et `updated_at` si modifiable), RLS + 4 politiques owner. Référentiels : lecture `authenticated`.
- Une migration = un fichier horodaté ; jamais modifier une migration déjà appliquée, en écrire une nouvelle.
- Après migration : types régénérés, Realtime si l'app lit la table en direct, `vue_jour` mise à jour si la journée change.
- jsonb pour les réglages (`profils.reglages.sport`, `.nutrition`) et les détails faiblement structurés (`exercices_seance.realise`) — toujours validés par un schéma zod côté core.

## Outils MCP

- Un outil = un verbe ou un nom clair, une entrée plate (pas d'objets imbriqués profonds), une sortie que l'agent peut répéter à l'utilisateur.
- La description dit **quand** l'utiliser et **ce qu'il faut demander avant** (ex. portée du remplacement). Elle est lue par un LLM : phrases courtes, pas de jargon interne.
- Lourd ou irréversible → `toolsAvecConfirmation` (l'agent demande avant). Lecture → jamais de confirmation.
- Tout outil est appelé par l'app via `executer()` : si l'UI a besoin d'une donnée que l'outil ne rend pas, on enrichit la sortie de l'outil, on ne fait pas une requête parallèle dans la page (sauf lecture d'affichage pure).

## UI

- **Mobile d'abord** : largeur max `max-w-lg`, cibles tactiles ≥ 44 px (`.tap`), zones sûres (`pt-safe`, `pb-safe`), pas de hover-only.
- **Hiérarchie d'écran** : header (`ModuleFrame`) → barre optionnelle (bande de jours, filtres) → hero (la chose à faire) → cartes d'entrée (`EntreeCarte`) → liens secondaires. Chaque niveau important expose ses sous-modules en cartes avec un chiffre et une ligne de contexte.
- **Feuilles** (`BottomSheet`) pour le contextuel ; une seule ouverte à la fois ; bouton principal plein (`bg-action-primary text-fg-on-brand`), secondaire `bg-surface-default`.
- **Navigation** : menu « Applications » + `ModuleBar` par app (`packages/ui/src/index.ts`). Un écran de détail : flèche retour à gauche, pas de burger. Les états et dates vont en query (`?jour=`, `?etat=`), jamais dans le chemin.
- **Couleurs** : rôles du design system Figma (`bg-surface-canvas|default|sunken`, `text-fg-primary|secondary|tertiary`, `border-line-default`, `bg-action-primary` + `text-fg-on-brand`, `text-fg-brand`, `bg-surface-brand-subtle`) ; statuts (`text-feedback-success-text`, `bg-feedback-danger-subtle`…) ; jamais d'hexa ni de primitive (`--amber-400`, `--brand-*`) dans un composant (la boxe utilise la 2ᵉ teinte du module : `text-fg-accent` / `bg-surface-accent`). Référence : `packages/ui/DESIGN_SYSTEM.md`.
- **Icônes** : Material Symbols Rounded par ligature (`<Icon name="fitness_center" />`), `filled` pour l'état actif.
- **Textes** : tutoiement, phrases courtes, chiffres en gros (`text-3xl font-semibold tracking-tight`), unités en petit. Vide = une phrase qui dit quoi faire, pas « Aucune donnée ».
- **Temps réel** : `RealtimeRefresh tables={[…]}` sur les écrans que l'agent peut modifier.
- **Accessibilité** : `aria-label` sur les boutons icône, `aria-current` sur l'actif, `role="dialog" aria-modal` sur les feuilles, contraste AA.

## Git

- Commits : `type(portée): quoi — pourquoi` en français ; types `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`. Portées : `sport`, `nutrition`, `quotidien`, `nav`, `core`, `agent`, `web`, `db`, `deploy`, `docs`.
- Un commit = un sujet. Le formatage (Biome) ne se mélange pas à une feature.
- Sur `main` directement en v1 (un seul développeur + agents) ; CI verte obligatoire avant de considérer le push livré.
- Les secrets : jamais. Si un secret fuit, on le révoque **avant** de nettoyer l'historique.
