/* KVALIA OS — FICHIER GÉNÉRÉ par scripts/build-tokens.mjs. Ne pas éditer. */

export const brands = [
  {
    "key": "home",
    "label": "Home",
    "icon": "home",
    "defaultTheme": "system",
    "hue": "indigo",
    "accent": "#3F56E8"
  },
  {
    "key": "sport",
    "label": "Sport",
    "icon": "fitness_center",
    "defaultTheme": "dark",
    "hue": "crimson",
    "accent": "#CA2C37"
  },
  {
    "key": "nutrition",
    "label": "Nutrition",
    "icon": "restaurant",
    "defaultTheme": "system",
    "hue": "orange",
    "accent": "#F0872B"
  },
  {
    "key": "quotidien",
    "label": "Courses",
    "icon": "shopping_cart",
    "defaultTheme": "system",
    "hue": "emerald",
    "accent": "#057149"
  },
  {
    "key": "finances",
    "label": "Finances",
    "icon": "account_balance_wallet",
    "defaultTheme": "system",
    "hue": "gold",
    "accent": "#D9A400"
  },
  {
    "key": "docs",
    "label": "Docs",
    "icon": "folder",
    "defaultTheme": "system",
    "hue": "brown",
    "accent": "#8B5A2B"
  },
  {
    "key": "agent",
    "label": "Agent",
    "icon": "auto_awesome",
    "defaultTheme": "system",
    "hue": "violet",
    "accent": "#6C36EA"
  }
] as const;
export type BrandKey = (typeof brands)[number]["key"];

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];
export const densities = ["comfortable","compact"] as const;
export type Density = (typeof densities)[number];

export const typeRoles = ["display-lg","display-md","headline-lg","headline-md","headline-sm","title-lg","title-md","title-sm","body-lg","body-md","body-sm","label-lg","label-md","label-sm","caption","overline","numeric-xl","numeric-lg","numeric-md","code"] as const;
export type TypeRole = (typeof typeRoles)[number];

/** Noms CSS des tokens consommables par l'UI (sémantiques + composants). Les primitives sont volontairement exclues. */
export const tokenNames = ["--kv-bg-canvas","--kv-bg-surface","--kv-bg-surface-raised","--kv-bg-surface-sunken","--kv-bg-surface-inverse","--kv-bg-glass","--kv-bg-scrim","--kv-bg-hover","--kv-bg-pressed","--kv-bg-selected","--kv-bg-disabled","--kv-bg-accent-solid","--kv-bg-accent-solid-hover","--kv-bg-accent-solid-pressed","--kv-bg-accent-subtle","--kv-bg-accent-muted","--kv-bg-success-solid","--kv-bg-success-subtle","--kv-bg-warning-solid","--kv-bg-warning-subtle","--kv-bg-danger-solid","--kv-bg-danger-subtle","--kv-bg-info-solid","--kv-bg-info-subtle","--kv-text-primary","--kv-text-secondary","--kv-text-tertiary","--kv-text-disabled","--kv-text-inverse","--kv-text-accent","--kv-text-on-accent","--kv-text-link","--kv-text-success","--kv-text-warning","--kv-text-danger","--kv-text-info","--kv-text-on-success","--kv-text-on-warning","--kv-text-on-danger","--kv-text-on-info","--kv-icon-primary","--kv-icon-secondary","--kv-icon-tertiary","--kv-icon-accent","--kv-icon-on-accent","--kv-icon-success","--kv-icon-warning","--kv-icon-danger","--kv-icon-info","--kv-border-subtle","--kv-border-default","--kv-border-strong","--kv-border-accent","--kv-border-focus","--kv-border-success","--kv-border-warning","--kv-border-danger","--kv-effect-shadow-key","--kv-effect-shadow-ambient","--kv-space-inset-none","--kv-space-inset-2xs","--kv-space-inset-xs","--kv-space-inset-sm","--kv-space-inset-md","--kv-space-inset-lg","--kv-space-inset-xl","--kv-space-inset-2xl","--kv-space-stack-2xs","--kv-space-stack-xs","--kv-space-stack-sm","--kv-space-stack-md","--kv-space-stack-lg","--kv-space-stack-xl","--kv-space-stack-2xl","--kv-space-inline-2xs","--kv-space-inline-xs","--kv-space-inline-sm","--kv-space-inline-md","--kv-space-inline-lg","--kv-layout-gutter","--kv-layout-section-gap","--kv-layout-page-max","--kv-layout-header-height","--kv-layout-nav-height","--kv-size-control-sm","--kv-size-control-md","--kv-size-control-lg","--kv-size-touch-target","--kv-size-icon-sm","--kv-size-icon-md","--kv-size-icon-lg","--kv-size-icon-xl","--kv-size-avatar-sm","--kv-size-avatar-md","--kv-size-avatar-lg","--kv-size-fab","--kv-radius-none","--kv-radius-xs","--kv-radius-sm","--kv-radius-control","--kv-radius-container","--kv-radius-pill","--kv-border-width-default","--kv-border-width-strong","--kv-border-width-focus","--kv-type-display-lg-family","--kv-type-display-lg-size","--kv-type-display-lg-line-height","--kv-type-display-lg-weight","--kv-type-display-lg-tracking","--kv-type-display-md-family","--kv-type-display-md-size","--kv-type-display-md-line-height","--kv-type-display-md-weight","--kv-type-display-md-tracking","--kv-type-headline-lg-family","--kv-type-headline-lg-size","--kv-type-headline-lg-line-height","--kv-type-headline-lg-weight","--kv-type-headline-lg-tracking","--kv-type-headline-md-family","--kv-type-headline-md-size","--kv-type-headline-md-line-height","--kv-type-headline-md-weight","--kv-type-headline-md-tracking","--kv-type-headline-sm-family","--kv-type-headline-sm-size","--kv-type-headline-sm-line-height","--kv-type-headline-sm-weight","--kv-type-headline-sm-tracking","--kv-type-title-lg-family","--kv-type-title-lg-size","--kv-type-title-lg-line-height","--kv-type-title-lg-weight","--kv-type-title-lg-tracking","--kv-type-title-md-family","--kv-type-title-md-size","--kv-type-title-md-line-height","--kv-type-title-md-weight","--kv-type-title-md-tracking","--kv-type-title-sm-family","--kv-type-title-sm-size","--kv-type-title-sm-line-height","--kv-type-title-sm-weight","--kv-type-title-sm-tracking","--kv-type-body-lg-family","--kv-type-body-lg-size","--kv-type-body-lg-line-height","--kv-type-body-lg-weight","--kv-type-body-lg-tracking","--kv-type-body-md-family","--kv-type-body-md-size","--kv-type-body-md-line-height","--kv-type-body-md-weight","--kv-type-body-md-tracking","--kv-type-body-sm-family","--kv-type-body-sm-size","--kv-type-body-sm-line-height","--kv-type-body-sm-weight","--kv-type-body-sm-tracking","--kv-type-label-lg-family","--kv-type-label-lg-size","--kv-type-label-lg-line-height","--kv-type-label-lg-weight","--kv-type-label-lg-tracking","--kv-type-label-md-family","--kv-type-label-md-size","--kv-type-label-md-line-height","--kv-type-label-md-weight","--kv-type-label-md-tracking","--kv-type-label-sm-family","--kv-type-label-sm-size","--kv-type-label-sm-line-height","--kv-type-label-sm-weight","--kv-type-label-sm-tracking","--kv-type-caption-family","--kv-type-caption-size","--kv-type-caption-line-height","--kv-type-caption-weight","--kv-type-caption-tracking","--kv-type-overline-family","--kv-type-overline-size","--kv-type-overline-line-height","--kv-type-overline-weight","--kv-type-overline-tracking","--kv-type-numeric-xl-family","--kv-type-numeric-xl-size","--kv-type-numeric-xl-line-height","--kv-type-numeric-xl-weight","--kv-type-numeric-xl-tracking","--kv-type-numeric-lg-family","--kv-type-numeric-lg-size","--kv-type-numeric-lg-line-height","--kv-type-numeric-lg-weight","--kv-type-numeric-lg-tracking","--kv-type-numeric-md-family","--kv-type-numeric-md-size","--kv-type-numeric-md-line-height","--kv-type-numeric-md-weight","--kv-type-numeric-md-tracking","--kv-type-code-family","--kv-type-code-size","--kv-type-code-line-height","--kv-type-code-weight","--kv-type-code-tracking","--kv-motion-duration-instant","--kv-motion-duration-fast","--kv-motion-duration-moderate","--kv-motion-duration-slow","--kv-motion-duration-deliberate","--kv-motion-duration-fade","--kv-motion-duration-stagger","--kv-motion-easing-standard","--kv-motion-easing-enter","--kv-motion-easing-exit","--kv-motion-easing-emphasized","--kv-motion-easing-emphasized-exit","--kv-motion-easing-spring","--kv-elevation-0","--kv-elevation-1","--kv-elevation-2","--kv-elevation-3","--kv-elevation-4","--kv-focus-ring","--kv-blur-glass","--kv-blur-scrim","--kv-opacity-disabled","--kv-opacity-muted","--kv-button-primary-bg","--kv-button-primary-bg-hover","--kv-button-primary-bg-pressed","--kv-button-primary-fg","--kv-button-secondary-bg","--kv-button-secondary-bg-hover","--kv-button-secondary-fg","--kv-button-ghost-bg","--kv-button-ghost-bg-pressed","--kv-button-ghost-fg","--kv-button-danger-bg","--kv-button-danger-fg","--kv-button-disabled-bg","--kv-button-disabled-fg","--kv-button-radius","--kv-button-height-sm","--kv-button-height-md","--kv-button-height-lg","--kv-button-padding-x-sm","--kv-button-padding-x-md","--kv-button-padding-x-lg","--kv-button-gap","--kv-input-bg","--kv-input-bg-disabled","--kv-input-border","--kv-input-border-hover","--kv-input-border-focus","--kv-input-border-error","--kv-input-fg","--kv-input-placeholder","--kv-input-label","--kv-input-helper","--kv-input-error","--kv-input-radius","--kv-input-height","--kv-input-padding-x","--kv-input-gap","--kv-card-bg","--kv-card-border","--kv-card-radius","--kv-card-padding","--kv-card-gap","--kv-widget-bg","--kv-widget-border","--kv-widget-title-fg","--kv-widget-value-fg","--kv-widget-accent","--kv-widget-radius","--kv-widget-padding","--kv-widget-gap","--kv-chip-bg","--kv-chip-border","--kv-chip-fg","--kv-chip-bg-selected","--kv-chip-fg-selected","--kv-chip-border-selected","--kv-chip-radius","--kv-chip-height","--kv-chip-padding-x","--kv-badge-bg","--kv-badge-fg","--kv-badge-radius","--kv-badge-padding-x","--kv-list-item-bg-hover","--kv-list-item-divider","--kv-list-item-min-height","--kv-list-item-padding-x","--kv-list-item-gap","--kv-nav-bar-bg","--kv-nav-bar-border","--kv-nav-bar-item-fg","--kv-nav-bar-item-fg-active","--kv-nav-bar-indicator","--kv-nav-bar-height","--kv-app-header-bg","--kv-app-header-fg","--kv-app-header-height","--kv-app-header-padding-x","--kv-fab-bg","--kv-fab-bg-pressed","--kv-fab-fg","--kv-fab-size","--kv-fab-radius","--kv-sheet-bg","--kv-sheet-scrim","--kv-sheet-handle","--kv-sheet-radius","--kv-sheet-padding","--kv-toast-bg","--kv-toast-fg","--kv-toast-radius","--kv-toast-padding","--kv-progress-track","--kv-progress-fill","--kv-progress-radius","--kv-agent-bubble-assistant-bg","--kv-agent-bubble-assistant-fg","--kv-agent-bubble-user-bg","--kv-agent-bubble-user-fg","--kv-agent-bubble-radius","--kv-agent-bubble-padding"] as const;
export type TokenName = (typeof tokenNames)[number];

/** `cssVar("--kv-bg-surface")` → `"var(--kv-bg-surface)"`, typé. */
export const cssVar = (name: TokenName, fallback?: string) => (fallback ? `var(${name}, ${fallback})` : `var(${name})`);

/** Classe utilitaire typo : `typeClass("title-md")` → `"kv-type-title-md"`. */
export const typeClass = (role: TypeRole) => `kv-type-${role}` as const;
