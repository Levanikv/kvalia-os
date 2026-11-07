# KVALIA OS — Design System v1

> Un shell, des mini-apps. Chaque mini-app a son identité, toutes parlent la même langue.

| | |
|---|---|
| Source de vérité | `packages/ui/tokens/*.json` (8 collections, 692 tokens) |
| Build | `pnpm --filter @kvalia/ui tokens` · contrôle CI : `tokens:check` |
| CSS | `@kvalia/ui/tokens.css` · Tailwind v4 : `@kvalia/ui/tailwind.css` |
| TS | `import { brands, cssVar, typeClass } from "@kvalia/ui"` |
| Figma | `packages/ui/figma/variables.json` + `figma/import.js` |
| Spécimen | `packages/ui/specimen/index.html` (ouvrir dans un navigateur) |
| Contraste | `packages/ui/tokens/CONTRAST.md` (798 vérifications, 0 échec) |

---

## 1. Principes

1. **Sémantique d'abord.** L'UI ne consomme que des rôles (`bg.surface`, `text.secondary`, `button.primary.bg`), jamais une valeur ni une primitive. C'est ce qui rend le multi-thème et le multi-brand gratuits.
2. **Une mini-app = un mode.** Changer d'identité, c'est changer un attribut (`data-brand`), pas réécrire des composants.
3. **Axes orthogonaux.** Brand × Theme × Densité × Typescale × Motion se combinent librement et s'imbriquent dans le DOM.
4. **Le build est le garde-fou.** Références cassées, couches violées, types incohérents, contrastes insuffisants : le build échoue. Une règle qui n'est pas vérifiée automatiquement est une règle qui sera violée.
5. **Mobile-first, pouce-first.** 44 px minimum de cible tactile, actions principales en bas d'écran, information utile en moins de 10 s.
6. **Calme par défaut.** Surfaces neutres, l'accent sert à guider (1 action primaire par écran), le mouvement explique, il ne décore pas.

---

## 2. Architecture des tokens

```
                 ┌──────────────┐
                 │ 1 Primitives │  valeurs brutes (rampes OKLCH, échelles)     1 mode
                 └──────┬───────┘
                        ▼
                 ┌──────────────┐
                 │   2 Brand    │  identité mini-app                           7 modes
                 └──────┬───────┘  home · sport · nutrition · quotidien · finances · docs · agent
        ┌───────────────┼──────────────────┬──────────────┐
        ▼               ▼                  ▼              ▼
  ┌──────────┐   ┌────────────┐   ┌──────────────┐  ┌──────────┐
  │ 3 Theme  │   │ 4 Layout   │   │ 5 Typography │  │ 6 Motion │
  │light·dark│   │comf.·compact│  │mobile·desktop│  │def.·reduc│
  └────┬─────┘   └─────┬──────┘   └──────┬───────┘  └────┬─────┘
       ▼               │                 │               │
  ┌──────────┐         │                 │               │
  │7 Effects │ ombres, focus, flous      │               │
  └────┬─────┘         │                 │               │
       ▼               ▼                 ▼               ▼
  ┌────────────────────────────────────────────────────────────┐
  │ 8 Components   alias uniquement — jamais de primitive      │
  └────────────────────────────────────────────────────────────┘
```

| # | Collection | Modes | Tokens | Peut référencer | Visible dans les pickers Figma |
|---|---|---|---|---|---|
| 1 | Primitives | value | 323 | — | non (`scopes: []`) |
| 2 | Brand | 7 mini-apps | 20 | Primitives | non |
| 3 | Theme | light, dark | 59 | Primitives, Brand | oui |
| 4 | Layout | comfortable, compact | 46 | Primitives, Brand | oui |
| 5 | Typography | mobile, desktop | 120 | Primitives, Brand | oui (et via text styles) |
| 6 | Motion | default, reduced | 13 | Primitives | non (pas de propriété Figma) |
| 7 | Effects | value | 10 | Primitives, Theme | via effect styles |
| 8 | Components | value | 101 | Theme, Layout, Typography, Motion, Effects | oui |

### 2.1 Format des fichiers

DTCG (`$type`, `$value`, `$description`) étendu avec les modes :

```jsonc
{
  "$collection": "Theme",
  "$modes": ["light", "dark"],
  "bg": {
    "surface": { "$type": "color", "$value": { "light": "{color.neutral.0}", "dark": "{color.neutral.900}" } }
  }
}
```

- `$value` simple → même valeur pour tous les modes.
- `$value` objet dont les clés sont les modes → une valeur par mode.
- `{chemin.du.token}` → alias. Les chemins sont globaux (toutes collections).

### 2.2 Nommage

| Couche | Chemin | CSS | Figma (collection / nom) |
|---|---|---|---|
| Primitive | `color.indigo.500` | `--kv-color-indigo-500` | Primitives / `color/indigo/500` |
| Brand | `brand.accent.solid` | `--kv-brand-accent-solid` | Brand / `accent/solid` |
| Theme | `text.secondary` | `--kv-text-secondary` | Theme / `text/secondary` |
| Layout | `space.inset.md` | `--kv-space-inset-md` | Layout / `space/inset/md` |
| Typography | `type.title-md.size` | `--kv-type-title-md-size` | Typography / `title-md/size` |
| Motion | `motion.duration.fast` | `--kv-motion-duration-fast` | Motion / `duration/fast` |
| Component | `button.primary.bg` | `--kv-button-primary-bg` | Components / `button/primary/bg` |

Règles : kebab-case, du général au particulier (`catégorie.rôle.variante.état`), états en suffixe (`-hover`, `-pressed`, `-selected`, `-disabled`), jamais de couleur littérale dans un nom sémantique (`text.accent`, pas `text.blue`).

---

## 3. Fondations

### 3.1 Couleur

**Primitives.** Rampes OKLCH à 11 pas (50 → 950), luminance perceptuelle homogène entre teintes, chaque rampe ancrée sur la couleur historique de la mini-app.

| Teinte | Rôle | Ancre |
|---|---|---|
| `indigo` | Home | 500 `#4F6BFF` |
| `crimson` | Sport | 500 `#E5484D` |
| `orange` | Nutrition | 400 `#F0872B` |
| `emerald` | Courses (quotidien) | 500 `#1FA971` |
| `gold` | Finances | 400 `#D9A400` |
| `brown` | Docs | 600 `#8B5A2B` |
| `violet` | Agent | 500 `#7C4DFF` |
| `green` `amber` `red` `blue` | **statuts uniquement** | — |
| `neutral` | 16 pas (0 → 1000), légèrement froid | — |
| `alpha.black/white/ink` | calques translucides (hover, scrim, glass, ombres) | — |

**Rôles sémantiques (Theme).**

| Famille | Rôles | Usage |
|---|---|---|
| `bg.*` | canvas, surface, surface-raised, surface-sunken, surface-inverse, glass, scrim | Hiérarchie de fonds. Canvas < surface < raised. Sunken = zone en creux. |
| | hover, pressed, selected, disabled | Calques d'interaction (translucides → marchent sur n'importe quel fond). |
| | accent-solid(-hover/-pressed), accent-subtle, accent-muted | Accent de la mini-app. |
| | {success,warning,danger,info}-solid / -subtle | Statuts. |
| `text.*` | primary, secondary, tertiary, disabled, inverse, accent, link, on-accent, {status}, on-{status} | Texte. `on-X` = texte posé sur `bg.X-solid`. |
| `icon.*` | primary, secondary, tertiary, accent, on-accent, {status} | Icônes (≥ 3:1). |
| `border.*` | subtle, default, strong, accent, focus, {status} | `subtle` = séparateur, `default` = contour décoratif, `strong` = contour fonctionnel (champ, ≥ 3:1). |
| `effect.*` | shadow-key, shadow-ambient | Couleurs d'ombre (plus fortes en dark). |

**Règles couleur**

- ✅ Une seule action en `bg.accent-solid` par écran ; les autres en `secondary` ou `ghost`.
- ✅ Texte sur accent plein → toujours `text.on-accent` (blanc pour la plupart, **noir pour Nutrition et Finances** : c'est la mini-app qui décide, pas le composant).
- ✅ Statut ≠ marque : `danger` reste rouge même dans Sport (crimson). Ne jamais utiliser `bg.accent-*` pour signifier un état.
- ✅ Une information portée par la couleur l'est aussi par une icône ou un texte (daltonisme).
- ❌ Pas de primitive dans l'UI, pas de hex en dur, pas d'opacité appliquée à une couleur sémantique (`bg-surface/50`) : utiliser `bg.hover`, `bg.glass`, `bg.scrim`.
- ❌ Pas de dégradé de marque sur du texte.

### 3.2 Typographie

**Polices.** Inter (texte, UI, chiffres) + une police display par mini-app :

| Mini-app | Display | Intention |
|---|---|---|
| Home, Nutrition, Courses | Inter Bold | neutre, efficace |
| Finances | Inter Semi Bold | sobre, précis |
| Sport | Barlow Condensed Bold | énergie, chrono |
| Docs | Fraunces SemiBold | éditorial, archive |
| Agent | Space Grotesk Bold | technique, « intelligent » |

Mono : JetBrains Mono (code, identifiants). Toutes sont des Google Fonts (disponibles dans Figma).

**Échelle par rôle** (mobile → desktop ≥ 1024 px)

| Rôle | Mobile | Desktop | Police | Usage |
|---|---|---|---|---|
| `display-lg` / `-md` | 40/48 · 32/40 | 56/64 · 44/52 | display | Hero, onboarding, écran vide majeur |
| `headline-lg/md/sm` | 28 · 24 · 20 | 32 · 28 · 24 | display | Titre d'écran / de mini-app / de section |
| `title-lg/md/sm` | 18 · 16 · 14 | 20 · 16 · 14 | Inter 600 | Titre de carte, de sheet, de ligne |
| `body-lg/md/sm` | 18/28 · 16/24 · 14/20 | = | Inter 400 | Texte courant (`body-md` par défaut) |
| `label-lg/md/sm` | 15 · 13 · 11 | = | Inter 500 | Boutons, chips, onglets, nav |
| `caption` | 12/16 | = | Inter 400 | Métadonnée, aide |
| `overline` | 11/16 caps | = | Inter 600 | Sur-titre de section |
| `numeric-xl/lg/md` | 40 · 28 · 18 | 48 · 32 · 18 | Inter, chiffres tabulaires | Montants, kcal, chronos, compteurs |
| `code` | 14/20 | = | JetBrains Mono | Code, ids |

**Règles typo**

- ✅ Toujours un rôle (`.kv-type-title-md` / text style `kvalia/title/md`), jamais une taille isolée.
- ✅ Tout chiffre comparable (montants, séries, macros) en `numeric-*` → `tabular-nums`, alignés à droite dans les listes.
- ✅ Un seul `headline-*` par écran ; hiérarchie max 3 niveaux visibles.
- ✅ Corps de texte : 16 px minimum en saisie (évite le zoom iOS), 45–75 caractères par ligne.
- ❌ Pas de police display en dessous de `headline-sm` ni pour du texte courant.
- ❌ Pas de MAJUSCULES hors `overline`.

### 3.3 Espacement, tailles, rayons

Grille de **4 px** (demi-pas de 2 px autorisés uniquement en Compact). Trois familles d'espacement sémantique :

| Famille | Sens | Exemple |
|---|---|---|
| `space.inset.*` | padding intérieur | carte `inset.md` = 16 |
| `space.stack.*` | écart vertical entre blocs | entre widgets `stack.sm` = 12 |
| `space.inline.*` | écart horizontal entre éléments | icône–label `inline.xs` = 6 |

Échelles `2xs xs sm md lg xl 2xl`. Densité : **Comfortable** (mobile, tactile, défaut) / **Compact** (desktop, pointeur — jamais sur mobile).

| Token | Comfortable | Compact |
|---|---|---|
| `layout.gutter` | 16 | 12 |
| `layout.section-gap` | 24 | 16 |
| `layout.page-max` | 448 | 448 |
| `size.control.sm/md/lg` | 32 / 44 / 52 | 28 / 36 / 44 |
| `size.touch-target` | 44 | 44 |

Rayons : `radius.control` et `radius.container` sont **pilotés par la mini-app** (Sport 6/12, Finances & Docs 8/16, Home & Courses 12/20, Nutrition 14/24, Agent 16/24) ; `radius.pill` pour chips, badges, FAB. Règle d'imbrication : rayon intérieur = rayon extérieur − padding (min. `radius.xs`).

**Règles**

- ✅ Toute cible tactile ≥ `size.touch-target` (44) — un bouton `sm` (32) doit avoir une zone de hit étendue.
- ✅ Les écarts entre groupes > écarts dans un groupe (loi de proximité).
- ❌ Pas de valeur arbitraire (`p-[13px]`). Si un espacement manque, on l'ajoute au système.

### 3.4 Effets

| Token | Usage |
|---|---|
| `elevation.0` | À plat, séparé par `border.subtle` (défaut des cartes et widgets) |
| `elevation.1` | Carte interactive au repos, éléments déplaçables |
| `elevation.2` | Menu, popover, carte en drag |
| `elevation.3` | Sheet, FAB, toast |
| `elevation.4` | Modale, dialogue |
| `focus.ring` | Anneau de focus clavier (2 px canvas + 2 px `border.focus`) |
| `blur.glass` (16) + `bg.glass` | Barres translucides (nav, header) |
| `blur.scrim` (4) + `bg.scrim` | Derrière sheets / modales |
| `opacity.disabled` (0.4), `opacity.muted` (0.64) | Uniquement pour images/illustrations désactivées ; le texte désactivé utilise `text.disabled` |

Règles : en dark, l'élévation se lit d'abord par la surface (`surface` → `surface-raised`), l'ombre est secondaire. Max 2 niveaux d'élévation visibles simultanément. Le focus clavier est toujours visible (`:focus-visible`), jamais supprimé.

### 3.5 Motion

| Durée | Default | Reduced | Usage |
|---|---|---|---|
| `instant` | 0 | 0 | toggle, check |
| `fast` | 100 ms | 0 | press, hover, couleur |
| `moderate` | 200 ms | 0 | tooltip, chip, menu |
| `slow` | 300 ms | 0 | carte qui s'étend, sheet partielle |
| `deliberate` | 500 ms | 0 | changement de mini-app, sheet plein écran |
| `fade` | 150 ms | 100 ms | fondu d'opacité — **seul mouvement conservé en Reduced** |
| `stagger` | 50 ms | 0 | décalage entre items d'une liste |

| Courbe | Valeur | Usage |
|---|---|---|
| `standard` | cubic-bezier(0.2, 0, 0, 1) | élément qui bouge dans l'écran |
| `enter` | cubic-bezier(0, 0, 0, 1) | élément qui entre |
| `exit` | cubic-bezier(0.3, 0, 1, 1) | élément qui sort (toujours plus court que l'entrée) |
| `emphasized` / `-exit` | (0.05, 0.7, 0.1, 1) / (0.3, 0, 0.8, 0.15) | transitions de mini-app, sheets |
| `spring` | `linear(…)` | réordonnancement de widgets, feedback « objectif atteint » |

**Chorégraphies de référence**

| Interaction | Recette |
|---|---|
| Press bouton / carte | `scale(0.97)` · `fast` · `standard` |
| Ouverture sheet « + » | translateY 100% → 0 · `deliberate` · `emphasized` ; scrim en `fade` |
| Fermeture sheet | `slow` · `emphasized-exit` |
| Entrée dans une mini-app | fondu + translateY 8 px · `deliberate` · `emphasized` ; la couleur d'accent bascule en `moderate` |
| Apparition d'une liste | items en `fade` + 4 px, `stagger` par item (max 6 items animés) |
| Toast | entrée `moderate`/`enter`, sortie `fast`/`exit`, reste 4 s (6 s si action) |
| Mise à jour d'un chiffre | crossfade `fade` ; pas de compteur qui défile en Reduced |

Règles : on anime `transform` et `opacity` uniquement ; pas d'animation en boucle hors état de chargement ; une animation ne bloque jamais l'interaction ; `prefers-reduced-motion` et `data-motion="reduced"` sont toujours respectés (automatique via les tokens).

---

## 4. Multi-theming & multi-brand

### 4.1 Les axes

| Axe | Attribut | Valeurs | Défaut | Mécanique CSS |
|---|---|---|---|---|
| Brand | `data-brand` | home, sport, nutrition, quotidien, finances, docs, agent | home | redéfinit `--kv-brand-*` |
| Theme | `data-theme` | light, dark | système | `color-scheme` + `light-dark()` |
| Densité | `data-density` | compact | comfortable | redéfinit les tokens Layout variables |
| Motion | `data-motion` | reduced | default (+ media query) | redéfinit les durées |
| Typescale | — | mobile / desktop | media `min-width: 1024px` | redéfinit les tailles |

Tous les axes sont **imbricables** : une carte Finances dans la Home, une bulle Agent dans Courses, un bloc dark dans une page light.

```html
<main data-brand="home">                       <!-- shell Home -->
  <section data-brand="finances">…</section>    <!-- widget Finances : accent or, rayons 8/16 -->
  <aside data-brand="agent" data-theme="dark">…</aside>
</main>
```

### 4.2 Shell d'une mini-app

Chaque mini-app pose ses attributs **sur son conteneur racine** et rien d'autre :

```tsx
import { brands } from "@kvalia/ui";
const sport = brands.find((b) => b.key === "sport")!;
<main data-brand="sport" data-theme={userTheme ?? (sport.defaultTheme === "dark" ? "dark" : undefined)}>
```

`brands[].defaultTheme` (Sport = `dark`) est une **préférence d'identité**, appliquée par le shell, jamais par le CSS : `data-brand` sert aussi à colorer de petits éléments (item de nav, widget) qui doivent garder le thème de leur parent. Le choix explicite de l'utilisateur gagne toujours.

### 4.3 Pourquoi ça marche (et la règle à ne pas casser)

Une variable CSS est résolue **là où elle est déclarée**. Si `--kv-bg-accent-solid` était déclarée seulement sur `:root`, elle garderait l'accent Home partout. Le build redéclare donc la couche sémantique + composants sur chaque frontière (`:root, [data-brand], [data-module], [data-density], [data-motion]`).

Conséquence vérifiée par le build : un token Layout/Typography/Motion **qui varie par mode ne peut pointer que vers des primitives**. Le thème, lui, passe par `light-dark()`, évalué au point d'usage selon le `color-scheme` le plus proche — aucune redéclaration nécessaire.

### 4.4 Ce qu'une mini-app peut / ne peut pas changer

| ✅ Brand peut changer | ❌ Brand ne change jamais |
|---|---|
| Rampe d'accent (11 pas) + solid / hover / pressed / on-solid | Neutres, surfaces, texte primaire/secondaire |
| Police et graisse display | Police de texte, tailles, interlignes |
| Rayons control / container | Espacements, tailles de contrôles, cibles tactiles |
| Thème par défaut (préférence) | Couleurs de statut, élévation, motion |

C'est ce qui garantit qu'on reste dans **une** app : la structure, le rythme et la lecture sont communs ; seule la personnalité varie.

### 4.5 Ajouter une mini-app (checklist)

1. Ajouter la rampe dans `primitives.json` (`color.<teinte>.50…950`, OKLCH, ancrée sur la couleur de marque).
2. Ajouter le mode dans `brand.json` (`$modes`, `$meta` : label, icône Material Symbols, `defaultTheme`, hue) et une valeur pour **chaque** token Brand. Choisir `accent.solid` + `on-solid` (blanc si le pas ≥ 600 passe AA, sinon un pas clair + noir).
3. `pnpm --filter @kvalia/ui tokens` → le build vérifie références et **contraste dans les deux thèmes**.
4. Vérifier dans le spécimen (matrice mini-apps).
5. Relancer l'import Figma (le mode apparaît dans la collection Brand).

### 4.6 Ajouter un thème (ex. High Contrast)

Ajouter le mode dans `theme.json` (`"$modes": ["light", "dark", "light-hc"]`) et une valeur par token. Côté CSS, `light-dark()` ne gère que deux valeurs : le build devra émettre un bloc `[data-theme="light-hc"]` qui redéclare la couche Theme (voir `buildCss`). Côté Figma, c'est un mode de plus, rien à changer.

---

## 5. Tokens de composants

Un token de composant existe quand **un composant a un choix de design propre** (quel fond pour le bouton secondaire ? quel rayon pour un chip ?). Il aliase toujours la couche sémantique — jamais une primitive ni Brand directement (vérifié par le build).

Inventaire v1 : `button` (primary, secondary, ghost, danger, disabled, tailles sm/md/lg), `input`, `card`, `widget`, `chip`, `badge`, `list-item`, `nav-bar`, `app-header`, `fab`, `sheet`, `toast`, `progress`, `agent-bubble`.

Convention : `<composant>.<variante>.<propriété>[-<état>]` → `button.primary.bg-hover`, `input.border-focus`, `chip.fg-selected`.

Quand **ne pas** créer de token de composant : si le composant utilise un rôle sémantique sans décision propre (un séparateur = `border.subtle`, point).

---

## 6. Patterns

### 6.1 Shell & navigation
- Header `app-header` (56, glass + blur) : titre `headline-sm` en police display, 1 action à droite max.
- Barre de nav basse `nav-bar` (64 + safe-area) : 5 destinations max, icône 24 + `label-sm`, item actif = `text.accent` + indicateur `bg.accent-subtle` pill. Chaque item porte `data-brand` de sa mini-app.
- Contenu : `max-width: layout.page-max`, marges `layout.gutter`, sections espacées de `layout.section-gap`.
- FAB « + » : 56, `bg.accent-solid`, `elevation.3`, au-dessus de la nav, ouvre la sheet de capture rapide.

### 6.2 Widget (Home)
Structure fixe : `title-fg` (label-md) → valeur (`numeric-lg`) + unité (`body-sm`, `text.secondary`) → visualisation (progress / sparkline) → action optionnelle. Le widget porte `data-brand` de sa mini-app source. Tap = ouvre la mini-app sur le bon contexte. Un widget = une question à laquelle on répond en < 2 s.

### 6.3 Listes (courses, transactions, documents)
`list-item` ≥ 52 (control.lg), groupées par en-tête `overline`, séparateurs `border.subtle`, swipe = actions secondaires (jamais la seule façon d'agir), montants alignés à droite en `numeric-md`. État vide : illustration ou icône 32, `title-md`, une phrase, une action.

### 6.4 Formulaires
Label toujours visible (`label-md`, au-dessus), placeholder = exemple, jamais consigne. Aide en `caption` `text.tertiary` ; erreur en `caption` `text.danger` + `border.danger` + icône, message qui dit comment corriger. Validation à la sortie du champ, pas à chaque frappe. Bouton primaire en bas, pleine largeur sur mobile.

### 6.5 Feedback
| Situation | Pattern |
|---|---|
| Action réussie, réversible | Toast `surface-inverse` + « Annuler » |
| Information contextuelle | Bandeau inline `bg.{status}-subtle` + `text.{status}` + icône |
| Confirmation destructive | Sheet avec bouton `danger` + bouton ghost « Annuler » |
| Chargement < 300 ms | rien ; > 300 ms : skeleton (`bg.surface-sunken`) ; > 2 s : message |

### 6.6 Agent (conversation)
Bulles `agent-bubble` : assistant à gauche (`surface-sunken`), utilisateur à droite (`accent-solid` de la mini-app courante), coin « queue » à 4 px. Les résultats d'outils s'affichent comme des composants natifs (ligne de liste, widget), pas comme du texte. L'agent porte `data-brand="agent"` uniquement sur son propre écran ; injecté dans une mini-app, il en hérite l'identité.

### 6.7 Données chiffrées
Finances, nutrition, sport : `numeric-*`, séparateur de milliers insécable fin, devise après le montant (« 84,20 € »), signe explicite pour les variations (+/−), couleur de statut seulement si l'écart est significatif.

---

## 7. Règles strictes (MUST / MUST NOT)

1. **MUST** consommer uniquement des tokens sémantiques ou de composants (`--kv-bg-*`, `--kv-text-*`, `--kv-button-*`…) ou leurs classes Tailwind (`bg-surface`, `text-fg-secondary`, `border-line-default`, `rounded-container`, `shadow-elevation-2`).
2. **MUST NOT** utiliser `--kv-color-*`, `--kv-brand-*`, un hex, un `rgb()` ou une taille arbitraire dans l'UI.
3. **MUST** poser `data-brand` sur le conteneur racine de chaque mini-app et sur chaque élément qui représente une autre mini-app (widget, item de nav).
4. **MUST** utiliser un rôle typographique (`kv-type-*`) pour tout texte.
5. **MUST** passer le build (`tokens:check`) avant de merger une modification de tokens. Les fichiers générés ne s'éditent pas à la main.
6. **MUST** respecter 44 px de cible tactile et un focus visible.
7. **MUST NOT** utiliser une couleur de marque pour un statut, ni une couleur de statut pour une marque.
8. **MUST NOT** ajouter un token de composant qui pointe vers une primitive.
9. **MUST** documenter tout nouveau token (`$description`) quand son usage n'est pas évident par son nom.
10. **MUST** versionner : ajout = mineur, changement de valeur = patch, renommage/suppression = majeur avec alias de transition d'une version.

---

## 8. Accessibilité

- Contrastes vérifiés automatiquement pour chaque mini-app × thème (`tokens/CONTRAST.md`) : texte 4.5:1, icônes / bordures fonctionnelles / focus 3:1.
- `text.disabled` est exempté (WCAG 1.4.3) mais un élément désactivé doit rester identifiable (forme, libellé).
- Texte zoomable jusqu'à 200 % sans perte (pas de hauteur fixe sur du texte).
- Mouvement réduit natif ; aucun contenu clignotant > 3 fois/s.

---

## 9. Figma

### 9.1 Structure (identique au code)

8 collections de variables, mêmes noms, mêmes modes : Primitives (Value) · Brand (Home, Sport, Nutrition, Quotidien, Finances, Docs, Agent) · Theme (Light, Dark) · Layout (Comfortable, Compact) · Typography (Mobile, Desktop) · Motion (Default, Reduced) · Effects (Value) · Components (Value).

- Theme aliase Brand : choisir le mode **Brand** et le mode **Theme** sur une frame suffit à re-colorer toute la maquette.
- Scopes ciblés (fonds → Fill, texte → Text, bordures → Stroke, espacements → Gap, rayons → Corner radius…) ; Primitives, Brand et Motion sont masqués des pickers.
- Code syntax WEB = `var(--kv-…)` sur chaque variable → Dev Mode affiche les vrais noms CSS.
- Text styles `kvalia/<rôle>` liés aux variables Typography (famille, style, taille, interligne) → suivent la mini-app et Mobile/Desktop.
- Effect styles `kvalia/elevation/0…4`, `kvalia/focus/ring`, `kvalia/blur/glass`, couleurs liées à Theme.
- 7 modes Brand ⇒ plan Organization ou Enterprise (Professional est limité à 4 modes par collection).

### 9.2 Import

`figma/import.js` est généré au build (payload inclus) et idempotent : il crée ou met à jour collections, modes, variables, alias, scopes, code syntax, text styles et effect styles. L'exécuter via le MCP Figma (`use_figma`) ou un plugin type Scripter sur le fichier cible, avec un compte **éditeur** du fichier.

### 9.3 Pages canvas prévues

`Cover` · `Foundations / Color` (primitives + matrice sémantique Light/Dark) · `Foundations / Type` · `Foundations / Spacing & Radius` · `Foundations / Effects` · `Foundations / Motion` · `Brands` (matrice mini-apps × thèmes, identique au spécimen) · `Components` (une page par composant, variantes liées aux tokens de composants).

---

## 10. Workflow

```bash
# modifier packages/ui/tokens/*.json, puis :
pnpm --filter @kvalia/ui tokens        # régénère CSS, TS, Tailwind, Figma, rapport de contraste
pnpm --filter @kvalia/ui tokens:check  # CI : échoue si tokens invalides ou sorties périmées
open packages/ui/specimen/index.html   # contrôle visuel
```
