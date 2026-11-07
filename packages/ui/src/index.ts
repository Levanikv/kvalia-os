/** Modules de KVALIA OS : clé, libellé, icône Material Symbols Rounded (ligature). */
export const modules = [
  { key: "home", label: "Home", icon: "home" },
  { key: "sport", label: "Sport", icon: "fitness_center" },
  { key: "nutrition", label: "Nutrition", icon: "restaurant" },
  { key: "quotidien", label: "Courses", icon: "shopping_cart" },
  { key: "finances", label: "Finances", icon: "account_balance_wallet" },
  { key: "docs", label: "Docs", icon: "folder" },
] as const;

export type ModuleKey = (typeof modules)[number]["key"];
