# KVALIA OS — Design System

> Source de vérité : le fichier Figma **Kvalia Design System**
> https://www.figma.com/design/Wsysc6DJl1WLzN7do7Ujjl/Kvalia-Design-System
> Le repo en est une copie exacte (`tokens/figma-variables.json`) et n'invente aucune valeur.

| | |
|---|---|
| Export Figma (source) | `packages/ui/tokens/figma-variables.json` — 560 variables, 16 text styles, 9 effect styles |
| Script d'export | `packages/ui/figma/export-variables.js` (à exécuter dans Figma) |
| Build | `pnpm --filter @kvalia/ui tokens` · CI : `tokens:check` · `tokens:strict` (contraste bloquant) |
| CSS | `@kvalia/ui/tokens.css` · Tailwind v4 : `@kvalia/ui/tailwind.css` |
| TS | `import { brands, modules, cssVar, typeClass } from "@kvalia/ui"` |
| Contraste | `packages/ui/tokens/CONTRAST.md` (504 vérifications, 7 mini-apps × 2 thèmes) |

---

## 1. Synchroniser avec Figma

Figma est la seule source. On ne modifie jamais `figma-variables.json` à la main.

1. Dans Figma, exécuter `figma/export-variables.js` (MCP `use_figma` ou plugin type Scripter).
2. Remplacer le contenu de `tokens/figma-variables.json` par le JSON retourné (une variable par ligne : le diff Git montre exactement ce qui a changé dans Figma).
3. `pnpm --filter @kvalia/ui tokens` → régénère `src/tokens.css`, `src/tailwind.css`, `src/tokens.gen.ts`, `tokens/CONTRAST.md`.
4. Relire `CONTRAST.md` ; commiter source + sorties ensemble.

Pourquoi un script plutôt que l'API REST : l'API « variables » de Figma n'est ouverte qu'au plan Enterprise.

Le build échoue si : un alias est cassé, deux variables ont le même nom CSS, une collection a des modes non gérés, ou un nom du pont Tailwind crée une référence circulaire. Avec `--strict`, un contraste sous le seuil AA échoue aussi.

---

## 2. Architecture

```
01 Primitives ─────────────── valeurs brutes (rampes 0→900, tailles, rayons, durées…)   1 mode
      │
02 Brand ──────────────────── palette d'une mini-app                                    7 modes
      │                       Nutrition · Sport · Quotidien · Finances · Entreprise · Documents · Objectifs
      ▼
03 Semantic · Color ───────── rôles couleur (surface, text, border, action, feedback,   Light / Dark
                              focus, overlay, data, elevation)
03 Semantic · Typography ──── 16 rôles typo (famille, taille, interligne, graisse, approche)
03 Semantic · Layout ──────── page, section (stack / inset), control, layer, breakpoint
03 Semantic · Shape ───────── radius, border-width, opacity, blur
03 Semantic · Motion ──────── durées et courbes
```

| Collection | Modes | Variables | Usage dans l'UI |
|---|---|---|---|
| 01 Primitives | Value | 210 | ❌ jamais directement |
| 02 Brand | 7 mini-apps | 124 | ❌ jamais directement (passe par la sémantique) |
| 03 Semantic · Color | Light, Dark | 65 | ✅ |
| 03 Semantic · Typography | Value | 80 | ✅ via les classes `.type-*` |
| 03 Semantic · Layout | Value | 49 | ✅ |
| 03 Semantic · Shape | Value | 21 | ✅ |
| 03 Semantic · Motion | Value | 11 | ✅ |

### 2.1 Les palettes Brand

Chaque mini-app définit trois teintes (rampes 0 → 900), avec les mêmes neutres et statuts partout :

| Mini-app | `data-brand` | primary (actions) | accent (2ᵉ teinte) | tertiary (illustrations) | Texte sur primary |
|---|---|---|---|---|---|
| Nutrition *(défaut)* | `nutrition` | amber | green | orange | amber-900 |
| Sport | `sport` | orange | red | amber | orange-900 |
| Quotidien | `quotidien` | green | blue | amber | green-900 |
| Finances | `finances` | blue | violet | green | blue-900 |
| Entreprise | `entreprise` | violet | blue | pink | **blanc** |
| Documents | `documents` | brass | amber | green | brass-900 |
| Objectifs | `objectifs` | pink | violet | orange | pink-900 |

`primary/hover` et `primary/pressed` sont choisis par mini-app pour garder le texte `on` à 4.5:1. Les couleurs translucides (`…/alpha/…-aNN`) sont résolues par mode, car Figma ne sait pas faire d'alias avec une opacité.

---

## 3. Dans le code

### 3.1 Axes

| Axe | Attribut | Valeurs | Défaut |
|---|---|---|---|
| Mini-app | `data-module` (posé par `ModuleFrame`) ou `data-brand` | `nutrition` `sport` `quotidien` `finances` `entreprise` `documents` `objectifs` | `nutrition` (1er mode Figma) |
| Thème | `data-theme` | `light` `dark` | suit le système |

- `data-module` et `data-brand` sont équivalents ; l'app utilise `data-module` (convention du registre `packages/ui`).
- Les modules **sans mode Brand dans Figma** (`home`, `reglages`, `capture`) héritent de la palette du parent, donc du défaut. Pour leur donner une identité : ajouter un mode dans **02 Brand** puis resynchroniser.
- **Sport est toujours sombre** (règle produit, dans `apps/web/src/app/globals.css` : `[data-module="sport"] { color-scheme: dark }`).
- Les axes sont imbricables : un widget Finances dans la Home porte `data-module="finances"`.

Mécanique : la couche Brand est redéfinie par `[data-brand]` / `[data-module]`, et toute la couche sémantique est redéclarée sur `:root, [data-brand], [data-module]` pour que `var()` se résolve avec la palette la plus proche. Le thème passe par `light-dark()`, résolu selon le `color-scheme` le plus proche.

### 3.2 Noms

Les noms CSS sont **exactement** le code syntax WEB défini dans Figma : `surface/canvas` → `--surface-canvas`, `section/stack/md` → `--stack-md`, `heading/title-md/font-size` → `--title-md-font-size`, `02 Brand · Color/primary/400` → `--brand-primary-400`. Dev Mode et le code parlent la même langue.

Effect styles → variables CSS : `Shadow/1…4` → `--shadow-1…4`, `Elevation/card|raised|floating|glass|brand-glow` → `--elevation-*`. Text styles → classes `.type-<rôle>` (`.type-display-xl`, `.type-title-md`, `.type-overline`…), avec `uppercase` et `tabular-nums` repris de Figma.

Unités : tailles, espacements, rayons, flous → `px` ; durées → `ms` ; graisses, opacités, z-index → sans unité ; approche des lettres → convertie en `em` (Figma la stocke en px à la taille du rôle).

### 3.3 Tailwind v4 (vocabulaire de l'app)

| Groupe Figma | Classe | Exemple |
|---|---|---|
| `surface/*` | `bg-surface-*` | `bg-surface-canvas` (page), `bg-surface-default` (cartes), `bg-surface-sunken` (puits) |
| `text/*` | `text-fg-*` | `text-fg-primary`, `text-fg-secondary`, `text-fg-tertiary`, `text-fg-brand` |
| `border/*` | `border-line-*` | `border-line-default`, `divide-line-subtle` |
| `action/*` | `bg-action-*` | `bg-action-primary text-fg-on-brand` |
| `feedback/*` | `*-feedback-*` | `bg-feedback-danger-subtle text-feedback-danger-text` |
| `focus/*`, `overlay/*`, `data/*` | `*-focus-*`, `*-overlay-*`, `*-data-*` | `bg-data-protein` |
| effect styles | `shadow-*` | `shadow-card`, `shadow-floating`, `shadow-brand-glow`, `shadow-step-1…4` |
| radius (via `globals.css`) | `rounded-sm|md|lg` | → `radius/tag` 10 · `radius/input` 16 · `radius/card` 28 |

**Règle d'or : `bg-action-primary` va toujours avec `text-fg-on-brand`, jamais `text-white`.** Le texte sur primary est foncé pour 6 mini-apps sur 7 (blanc seulement pour Entreprise).

Autres rayons, espacements et durées : variables du DS (`rounded-[var(--radius-sheet)]`, `p-[var(--inset-md)]`, `duration-[var(--duration-base)]`). Ils ne sont pas dans le pont généré car leurs noms entrent en collision avec les espaces de noms de Tailwind (`--radius-*`, `--blur-*`).

Constantes du shell, hors Figma (`globals.css`) : `--tabbar-h` = `--control-xl` (64 px), `--header-h` = 56 px.

### 3.4 Migration depuis les tokens v0

Correspondance appliquée à l'app lors du passage au design system Figma (pour relire un vieux diff ou un vieux snippet) :

| v0 | Design system |
|---|---|
| `bg-surface` / `--surface` | `bg-surface-canvas` / `--surface-canvas` |
| `bg-surface-2` / `--surface-2` | `bg-surface-default` / `--surface-default` |
| `bg-surface-3` / `--surface-3` | `bg-surface-sunken` / `--surface-sunken` |
| `text-text` · `text-text-2` · `text-text-3` | `text-fg-primary` · `text-fg-secondary` · `text-fg-tertiary` |
| `border-border` / `--border` | `border-line-default` / `--border-default` |
| `bg-accent` / `--module-accent` | `bg-action-primary` / `--action-primary` |
| `text-white` sur `bg-accent` | `text-fg-on-brand` |
| `text-accent` | `text-fg-brand` |
| `bg-accent-soft` | `bg-surface-brand-subtle` |
| `text-success` · `text-danger` | `text-feedback-success-text` · `text-feedback-danger-text` |
| `bg-success` · `bg-danger` | `bg-feedback-success` · `bg-feedback-danger` |

### 3.5 Polices

Geist et Geist Mono, chargées par `next/font` dans `apps/web/src/app/layout.tsx` (`--font-geist-sans` / `--font-geist-mono`). `--font-sans` et `--font-mono` les reprennent, avec des polices système en secours.

---

## 4. Règles (reprises des descriptions Figma)

**Couleur**
- L'UI ne consomme que `03 Semantic`. Jamais `--brand-*`, jamais une primitive (`--amber-400`), jamais un hex.
- `primary` = actions, sélection, anneaux, texte de marque. `accent` = dégradé de fond, accents, série 2. `tertiary` = illustrations, série 3 : **jamais une action**.
- Texte et icônes sur `action/primary` ou `surface/brand` → toujours `text/on-brand`.
- `surface/glass` toujours avec `blur/glass` et `border/default`.
- `elevation/glow` / `Elevation/brand-glow` : sous **le seul** CTA principal, FAB ou pill sélectionnée de l'écran.
- `text/disabled` uniquement pour les libellés désactivés (exempté de contraste).
- Données nutrition : `data/protein|carbs|fat|fiber` ; graphiques génériques : `data/series-1…3` ; piste vide : `data/track`.

**Fond d'écran (Ground)**
- `surface/ground` = `surface/canvas`, avec un dégradé `surface/ground-from` (coin chaud, haut droite) → `surface/ground-to` (coin froid, milieu gauche).

**Typographie**
- Toujours un rôle : `.type-*` en code, text style `Heading/…`, `Body/…`, `Label/…`, `Code/…` dans Figma.
- Chiffres (anneaux, KPI) : `display-xl`, `numeric-lg`, `numeric-md` (chiffres tabulaires).
- `overline` et `mono-xs` en majuscules, en Geist Mono : méta, unités, tags.

**Layout & forme**
- Cible tactile minimale `--control-min` (44 px) partout.
- Marges : `--page-gutter` (cartes), `--page-gutter-wide` (en-têtes, texte). Espaces : `--stack-*` (vertical), `--inset-*` (padding), `--inline-*` (horizontal).
- Rayons par usage : `tag` 10 · `input` 16 · `thumb` 18 · `tile` 24 · `card` 28 · `card-hero` 32 (**une seule** par écran) · `sheet` 36 · `control` / `avatar` pleins.
- Focus clavier : contour `--border-width-focus` en `--focus-ring`, décalé de 2 px (classe `.focus-ring`) ; halo `--focus-halo` de 4 px autour d'un champ.
- Élévation : `Elevation/card` (ombre en light, reflet intérieur en dark), `raised` (carte héros, sheet), `floating` (tab bar, toast, FAB), `glass`.
- Superposition : `--z-base` < `raised` < `sticky` < `nav` < `fab` < `sheet` < `overlay` < `toast`.

**Motion**
- `fast` 100 ms (tap) · `quick` 160 ms (hover, sortie) · `base` 240 ms (entrée) · `slow` 360 ms (sheet) · `slower` 520 ms (célébration).
- Courbes : `standard` (changements d'état), `emphasized` (sheets, pages), `decelerate` (entrée), `accelerate` (sortie), `spring` (**célébrations uniquement**).
- Respecter `prefers-reduced-motion` (couper translations et ressorts, garder les fondus).

---

## 5. Accessibilité

`tokens/CONTRAST.md` vérifie, pour chaque mini-app et chaque thème : textes primaire / secondaire / tertiaire / marque sur les surfaces, `on-brand` sur toutes les variantes d'action, inverse, glass, textes de feedback sur leurs fonds, et l'anneau de focus (3:1). Résultat actuel : **504 / 504 conformes**. Une modification dans Figma qui casserait un de ces contrastes apparaît dans le rapport au prochain build (bloquant avec `tokens:strict`).
