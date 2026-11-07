/**
 * @kvalia/ui — design system KVALIA OS.
 * Tokens : `@kvalia/ui/tokens.css` (+ `@kvalia/ui/tailwind.css` pour Tailwind v4).
 * Doc et règles : packages/ui/DESIGN_SYSTEM.md.
 */
export * from "./tokens.gen";
import { brands } from "./tokens.gen";

/** Mini-apps de la barre de navigation (l'agent est transverse et n'y figure pas). */
export const modules = brands.filter((b) => b.key !== "agent").map(({ key, label, icon }) => ({ key, label, icon }));
export type ModuleKey = (typeof modules)[number]["key"];
