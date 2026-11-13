/**
 * Registre des modules de KVALIA OS — source : docs/sitemap.md.
 * Un module = un préfixe d'URL = un accent (`data-module`) = une icône Material Symbols Rounded (ligature).
 *
 * Navigation (v1.1) : un menu « apps » (burger, en haut à gauche) liste les applications ; chaque application
 * a sa propre barre inférieure (`onglets`) qui expose ses entrées. Sport et Nutrition forment une seule application.
 */
/** `icon` : ligature Material Symbols, ou `ds:<nom>` pour une icône du design system (Figma Icon/*). */
export type Onglet = { href: string; label: string; icon: string };

/** Design system (généré depuis Figma « Kvalia Design System ») : brands, typeRoles, cssVar, typeClass… */
export * from "./tokens.gen";

export const modules = [
  { key: "home", label: "Home", icon: "home", path: "/", titre: "Aujourd’hui", description: "Ta journée en un coup d’œil" },
  { key: "quotidien", label: "Quotidien", icon: "checklist", path: "/quotidien/courses", titre: "Quotidien", description: "Courses, tâches, habitudes" },
  { key: "sport", label: "Sport & Nutrition", icon: "fitness_center", path: "/sport", titre: "Sport", description: "Programme, séances, calories" },
  { key: "nutrition", label: "Nutrition", icon: "restaurant", path: "/nutrition", titre: "Nutrition", description: "Bilan du jour, repas, recettes" },
  { key: "finances", label: "Finances", icon: "account_balance_wallet", path: "/finances", titre: "Finances", description: "Comptes, budgets, transactions" },
  {
    key: "entreprise",
    label: "Entreprise",
    icon: "business_center",
    path: "/entreprise",
    titre: "Entreprise",
    description: "SASU : pilotage, factures, échéances",
  },
  { key: "documents", label: "Documents", icon: "folder", path: "/documents", titre: "Porte-documents", description: "Papiers, contrats, expirations" },
  { key: "objectifs", label: "Objectifs", icon: "flag", path: "/objectifs", titre: "Objectifs", description: "Ce que tu vises, où tu en es" },
  { key: "reglages", label: "Réglages", icon: "settings", path: "/reglages", titre: "Réglages", description: "Programme, nutrition, agent, compte" },
  { key: "capture", label: "Capture", icon: "add", path: "/capture", titre: "Capture", description: "Dire quelque chose à l’agent" },
] as const;

export type ModuleKey = (typeof modules)[number]["key"];
export type Module = (typeof modules)[number];

/** Les applications listées dans le menu burger, dans l'ordre. Nutrition est dans Sport & Nutrition ; Capture est le bouton « + ». */
export const menuApps: readonly ModuleKey[] = ["home", "quotidien", "sport", "finances", "entreprise", "documents", "objectifs", "reglages"];

/** Barre inférieure de chaque application : ses entrées principales. */
export const onglets: Record<ModuleKey, readonly Onglet[]> = {
  home: [
    { href: "/", label: "Aujourd’hui", icon: "today" },
    { href: "/objectifs", label: "Objectifs", icon: "flag" },
    { href: "/documents", label: "Documents", icon: "folder" },
  ],
  quotidien: [
    { href: "/quotidien/courses", label: "Courses", icon: "shopping_cart" },
    { href: "/quotidien/taches", label: "Tâches", icon: "task_alt" },
    { href: "/quotidien/habitudes", label: "Habitudes", icon: "repeat" },
  ],
  sport: [
    // Icônes du design system (préfixe « ds: », maquette Sport/Tab bar) ; les autres apps utilisent encore Material Symbols.
    { href: "/sport", label: "Jour", icon: "ds:sport" },
    { href: "/sport/programme", label: "Programme", icon: "ds:target" },
    { href: "/sport/exercices", label: "Exercices", icon: "ds:play" },
    { href: "/nutrition", label: "Nutrition", icon: "ds:nutrition" },
  ],
  nutrition: [], // = sport (voir barrePour)
  finances: [
    { href: "/finances", label: "Vue", icon: "donut_large" },
    { href: "/finances/transactions", label: "Transactions", icon: "receipt_long" },
    { href: "/finances/budgets", label: "Budgets", icon: "savings" },
    { href: "/finances/comptes", label: "Comptes", icon: "account_balance" },
  ],
  entreprise: [
    { href: "/entreprise", label: "Pilotage", icon: "monitoring" },
    { href: "/entreprise/factures", label: "Factures", icon: "request_quote" },
    { href: "/entreprise/charges", label: "Charges", icon: "payments" },
    { href: "/entreprise/echeances", label: "Échéances", icon: "event" },
    { href: "/entreprise/simulateur", label: "Simuler", icon: "calculate" },
  ],
  documents: [
    { href: "/documents", label: "Documents", icon: "folder" },
    { href: "/documents/nouveau", label: "Ajouter", icon: "upload_file" },
    { href: "/objectifs", label: "Objectifs", icon: "flag" },
  ],
  objectifs: [
    { href: "/objectifs", label: "Objectifs", icon: "flag" },
    { href: "/documents", label: "Documents", icon: "folder" },
    { href: "/", label: "Aujourd’hui", icon: "today" },
  ],
  reglages: [
    { href: "/reglages", label: "Réglages", icon: "settings" },
    { href: "/reglages/sport", label: "Sport", icon: "fitness_center" },
    { href: "/reglages/nutrition", label: "Nutrition", icon: "restaurant" },
    { href: "/reglages/journal", label: "Journal", icon: "history" },
  ],
  capture: [],
};

export function module(key: ModuleKey): Module {
  return modules.find((m) => m.key === key)!;
}

/** L'application (entrée du menu) à laquelle appartient un module : nutrition → sport, capture → home. */
export function appPour(key: ModuleKey): ModuleKey {
  if (key === "nutrition") return "sport";
  if (key === "capture") return "home";
  return key;
}

/** La barre inférieure à afficher pour un module. */
export function barrePour(key: ModuleKey): readonly Onglet[] {
  return onglets[appPour(key)];
}

/** Déduit le module depuis le premier segment d'un chemin. `/nutrition/plan` → nutrition ; `/` → home. */
export function moduleDepuisChemin(pathname: string): ModuleKey {
  const premier = pathname.split("/")[1] ?? "";
  const m = modules.find((x) => x.key === premier);
  return m ? m.key : "home";
}

/** L'onglet actif d'une barre pour un chemin : le préfixe le plus long qui correspond. */
export function ongletActif(barre: readonly Onglet[], pathname: string): Onglet | undefined {
  let meilleur: Onglet | undefined;
  for (const o of barre) {
    const ok = o.href === "/" ? pathname === "/" : pathname === o.href || pathname.startsWith(o.href + "/");
    if (ok && (!meilleur || o.href.length > meilleur.href.length)) meilleur = o;
  }
  return meilleur;
}

/** @deprecated v1.0 — conservé pour compatibilité ; la tab bar globale a été remplacée par le menu apps + barres par app. */
export const tabBar: readonly ModuleKey[] = ["home", "quotidien", "sport", "finances", "entreprise"];
/** @deprecated v1.0 */
export const menuHeader: readonly ModuleKey[] = ["documents", "objectifs", "reglages"];
/** @deprecated v1.0 */
export function ongletPour(key: ModuleKey): ModuleKey {
  return appPour(key);
}

/** Parcours plein écran (création de programme…) : ni barre inférieure ni bouton « + ». */
export const ECRANS_PLEIN_ECRAN: readonly string[] = ["/sport/programme/nouveau", "/sport/bienvenue", "/sport/seance"];
export function estPleinEcran(chemin: string): boolean {
  return ECRANS_PLEIN_ECRAN.some((p) => chemin === p || chemin.startsWith(p + "/"));
}
