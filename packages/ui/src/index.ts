/**
 * Registre des modules de KVALIA OS — source : docs/sitemap.md.
 * Un module = un préfixe d'URL = un accent (`data-module`) = une icône Material Symbols Rounded (ligature).
 */
export const modules = [
  { key: "home", label: "Home", icon: "home", path: "/", titre: "Aujourd’hui" },
  { key: "quotidien", label: "Quotidien", icon: "checklist", path: "/quotidien/courses", titre: "Quotidien" },
  { key: "sport", label: "Sport & Nutri", icon: "fitness_center", path: "/sport", titre: "Sport" },
  { key: "nutrition", label: "Nutrition", icon: "restaurant", path: "/nutrition", titre: "Nutrition" },
  { key: "finances", label: "Finances", icon: "account_balance_wallet", path: "/finances", titre: "Finances" },
  { key: "entreprise", label: "Entreprise", icon: "business_center", path: "/entreprise", titre: "Entreprise" },
  { key: "documents", label: "Documents", icon: "folder", path: "/documents", titre: "Porte-documents" },
  { key: "objectifs", label: "Objectifs", icon: "flag", path: "/objectifs", titre: "Objectifs" },
  { key: "reglages", label: "Réglages", icon: "settings", path: "/reglages", titre: "Réglages" },
  { key: "capture", label: "Capture", icon: "add", path: "/capture", titre: "Capture" },
] as const;

export type ModuleKey = (typeof modules)[number]["key"];
export type Module = (typeof modules)[number];

/** Les 5 entrées de la tab bar (Sport & Nutrition partagent un onglet). */
export const tabBar: readonly ModuleKey[] = ["home", "quotidien", "sport", "finances", "entreprise"];

/** Ce qui vit dans le menu du header (avatar en haut à droite). */
export const menuHeader: readonly ModuleKey[] = ["documents", "objectifs", "reglages"];

export function module(key: ModuleKey): Module {
  return modules.find((m) => m.key === key)!;
}

/** Déduit le module depuis le premier segment d'un chemin. `/nutrition/plan` → nutrition ; `/` → home. */
export function moduleDepuisChemin(pathname: string): ModuleKey {
  const premier = pathname.split("/")[1] ?? "";
  const m = modules.find((x) => x.key === premier);
  return m ? m.key : "home";
}

/** L'onglet de la tab bar à surligner pour un module (nutrition → onglet sport). */
export function ongletPour(key: ModuleKey): ModuleKey {
  if (key === "nutrition") return "sport";
  return tabBar.includes(key) ? key : "home";
}
