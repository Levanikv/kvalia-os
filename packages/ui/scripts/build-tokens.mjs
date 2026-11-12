#!/usr/bin/env node
/**
 * KVALIA OS — build des design tokens depuis l'export Figma (zéro dépendance).
 *
 * Source de vérité : le fichier Figma « Kvalia Design System », exporté tel quel dans
 * tokens/figma-variables.json par figma/export-variables.js. Ce script ne modifie jamais cette source.
 *
 * Sorties (générées — ne pas éditer) :
 *   src/tokens.css       variables CSS (noms = code syntax WEB de Figma), multi-brand + light/dark, ombres, classes typo
 *   src/tailwind.css     pont Tailwind v4 (couleurs sémantiques + ombres)
 *   src/tokens.gen.ts    métadonnées typées (brands, noms de tokens, rôles typo)
 *   tokens/CONTRAST.md   rapport de contraste WCAG par mini-app × thème
 *
 * Échoue si : alias cassé, nom CSS dupliqué, structure inattendue. `--strict` échoue aussi sur un contraste insuffisant.
 * Usage : node scripts/build-tokens.mjs [--check] [--strict]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK = process.argv.includes("--check");
const STRICT = process.argv.includes("--strict");
const SRC = JSON.parse(fs.readFileSync(path.join(ROOT, "tokens/figma-variables.json"), "utf8"));
const errors = [];
const fail = (m) => errors.push(m);

// ---------------------------------------------------------------------------
// 1. Modèle
// ---------------------------------------------------------------------------
const TYPE = { C: "color", F: "float", S: "string", B: "boolean" };
const colls = SRC.collections.map((c, i) => ({
  index: i,
  name: c.name,
  modes: c.modes,
  role: i === 0 ? "primitives" : /brand/i.test(c.name) ? "brand" : c.modes.join() === "Light,Dark" ? "theme" : c.modes.length === 1 ? "static" : "moded",
}));
const vars = new Map(); // "<coll>:<name>" -> var
for (const [i, c] of SRC.collections.entries()) {
  for (const [name, t, scopes, value, web, desc] of c.variables) {
    const key = `${i}:${name}`;
    const values = colls[i].modes.length === 1 ? { [colls[i].modes[0]]: value } : Object.fromEntries(colls[i].modes.map((m, j) => [m, value[j]]));
    const css = web ? web.replace(/^var\((--[^)]+)\)$/, "$1") : `--${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    vars.set(key, { key, name, coll: colls[i], type: TYPE[t], scopes: scopes ? scopes.split(",") : [], values, css, description: desc || "" });
  }
}
for (const c of colls) if (c.role === "moded") fail(`Collection « ${c.name} » : modes ${c.modes.join("/")} non gérés (attendu : 1 mode, Light/Dark, ou Brand)`);

const isAlias = (v) => typeof v === "string" && v.startsWith("@");
const aliasKey = (v) => v.slice(1);
const byCss = new Map();
for (const v of vars.values()) {
  if (byCss.has(v.css)) fail(`Nom CSS dupliqué ${v.css} : ${byCss.get(v.css).name} / ${v.name}`);
  byCss.set(v.css, v);
  for (const val of Object.values(v.values)) if (isAlias(val) && !vars.has(aliasKey(val))) fail(`${v.coll.name}/${v.name} → ${val} : alias introuvable`);
}

// ---------------------------------------------------------------------------
// 2. Résolution & valeurs CSS
// ---------------------------------------------------------------------------
const brandColl = colls.find((c) => c.role === "brand");
const BRANDS = brandColl.modes;
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
const DEFAULT = { brand: BRANDS[0], theme: "Light" };
function resolve(key, ctx = DEFAULT, depth = 0) {
  const v = vars.get(key);
  const mode = v.coll.role === "brand" ? ctx.brand : v.coll.role === "theme" ? ctx.theme : v.coll.modes[0];
  const val = v.values[mode];
  return isAlias(val) ? resolve(aliasKey(val), ctx, depth + 1) : val;
}

const PX_SCOPES = ["FONT_SIZE", "LINE_HEIGHT", "GAP", "WIDTH_HEIGHT", "CORNER_RADIUS", "STROKE_FLOAT", "EFFECT_FLOAT"];
function floatUnit(v) {
  if (v.scopes.some((s) => PX_SCOPES.includes(s))) return "px";
  if (v.scopes.includes("LETTER_SPACING")) return "em";
  if (v.scopes.includes("FONT_WEIGHT") || v.scopes.includes("OPACITY")) return "";
  const n = v.name;
  if (/duration/i.test(n)) return "ms";
  if (/weight|opacity|^layer\//i.test(n)) return "";
  return "px"; // size, line-height, space, radius, border-width, blur, breakpoint
}
const isOpacity = (v) => v.scopes.includes("OPACITY") || /(^|\/)opacity\//i.test(v.name);
const FONT_STACK = {
  Geist: `"Geist", var(--font-geist-sans, ui-sans-serif), system-ui, -apple-system, "Segoe UI", sans-serif`,
  "Geist Mono": `"Geist Mono", var(--font-geist-mono, ui-monospace), SFMono-Regular, Menlo, monospace`,
};
function sizeFor(v) {
  // letter-spacing est stocké en px à la taille du rôle ; on le convertit en em pour le web.
  const sizeKey = `${v.coll.index}:${v.name.replace(/letter-spacing$/, "font-size")}`;
  return vars.has(sizeKey) ? resolve(sizeKey) : null;
}
function cssValue(v, val) {
  if (isAlias(val)) return `var(${vars.get(aliasKey(val)).css})`;
  switch (v.type) {
    case "color":
      return val;
    case "string":
      return v.scopes.includes("FONT_FAMILY") || /family/i.test(v.name) ? (FONT_STACK[val] ?? `"${val}", sans-serif`) : val;
    case "boolean":
      return val ? "1" : "0";
    case "float": {
      const unit = floatUnit(v);
      if (unit === "em") {
        const size = sizeFor(v);
        return size ? `${+(val / size).toFixed(4)}em` : `${val}px`;
      }
      if (val === 9999 && unit === "px") return "9999px";
      // Figma stocke les opacités en pourcentage (0–100) ; CSS attend 0–1.
      if (isOpacity(v)) return `${+(val / 100).toFixed(4)}`;
      return `${val}${unit}`;
    }
  }
  throw new Error(`type ${v.type}`);
}
const decl = (v, val, ind = "  ") => `${ind}${v.css}: ${val};`;

// ---------------------------------------------------------------------------
// 3. CSS
// ---------------------------------------------------------------------------
const effectName = (s) => `--${slug(s.name)}`;
for (const s of SRC.effectStyles) if (byCss.has(effectName(s))) fail(`Le style d'effet ${s.name} entre en collision avec la variable ${effectName(s)}`);
const shadowCss = (s) =>
  s.effects
    .filter((e) => e.type.endsWith("SHADOW"))
    .map((e) => {
      const b = (k, raw) => (e.bound?.[k] ? `var(${vars.get(aliasKey(e.bound[k])).css})` : raw);
      const color = b("color", e.color);
      return `${e.type === "INNER_SHADOW" ? "inset " : ""}${b("offsetX", `${e.x}px`)} ${b("offsetY", `${e.y}px`)} ${b("radius", `${e.blur}px`)} ${b("spread", `${e.spread}px`)} ${color}`;
    })
    .join(", ") || "none";
const roleOf = (t) => slug(t.name.split("/").pop());

const LEGACY = {
  "--surface-canvas": "--surface-page",
  "--surface-ground": "--surface-page",
  "--surface-ground-from": "--surface-page-gradient-from",
  "--surface-ground-to": "--surface-page-gradient-to",
  "--surface-default": "--surface-container-default",
  "--surface-raised": "--surface-container-raised",
  "--surface-sunken": "--surface-container-sunken",
  "--surface-glass": "--surface-container-glass",
  "--surface-inverse": "--surface-container-inverse",
  "--surface-brand": "--surface-container-brand",
  "--surface-brand-subtle": "--surface-container-brand-subtle",
  "--surface-brand-muted": "--surface-container-brand-subtle",
  "--surface-accent": "--surface-container-accent",
  "--surface-accent-subtle": "--surface-container-accent-subtle",
  "--data-protein": "--nutrition-data-protein",
  "--data-carbs": "--nutrition-data-carbs",
  "--data-fat": "--nutrition-data-fat",
  "--data-fiber": "--nutrition-data-fiber",
};
const darkFloats = [];
function buildCss() {
  const L = [];
  const list = (role) => [...vars.values()].filter((v) => v.coll.role === role);
  L.push(`/*
  KVALIA OS — Design tokens. FICHIER GÉNÉRÉ par packages/ui/scripts/build-tokens.mjs — ne pas éditer.
  Source : Figma « Kvalia Design System » → packages/ui/tokens/figma-variables.json. Doc : packages/ui/DESIGN_SYSTEM.md
  Noms CSS = code syntax WEB des variables Figma.

  Axes (attributs HTML, combinables et imbricables) :
    data-brand="${BRANDS.map(slug).join("|")}"   (défaut : ${slug(BRANDS[0])})
    data-module="…"           alias de data-brand (posé par ModuleFrame) ; un module sans palette Figma hérite du parent
    data-theme="light|dark"   (absent = suit le système)
*/
`);
  L.push(`/* 1 · PRIMITIVES (${colls[0].name}) — ne jamais consommer directement dans l'UI */\n:root {`);
  for (const v of list("primitives")) L.push(decl(v, cssValue(v, v.values[v.coll.modes[0]])));
  L.push(`}\n`);

  L.push(`/* 2 · BRAND (${brandColl.name}) — un bloc par mini-app */`);
  for (const [i, b] of BRANDS.entries()) {
    L.push(`${i === 0 ? ":root,\n" : ""}[data-brand="${slug(b)}"],\n[data-module="${slug(b)}"] {`);
    for (const v of list("brand")) L.push(decl(v, cssValue(v, v.values[b])));
    L.push(`}`);
  }
  L.push(`\n/* 3 · THÈME — light-dark() suit le color-scheme le plus proche */
:root { color-scheme: light dark; }
[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }
`);
  L.push(`/* 4 · SÉMANTIQUE + EFFETS — redéclarés à chaque frontière data-brand pour que var() se résolve
   avec la palette de la mini-app la plus proche. */\n:root,\n[data-brand],\n[data-module] {`);
  for (const c of colls.filter((c) => c.role === "theme" || c.role === "static")) {
    L.push(`  /* ${c.name} */`);
    for (const v of [...vars.values()].filter((v) => v.coll === c)) {
      if (c.role === "theme") {
        const [l, d] = [cssValue(v, v.values.Light), cssValue(v, v.values.Dark)];
        // light-dark() n'accepte que des couleurs : les nombres (géométrie des ombres) passent par le bloc sombre plus bas.
        L.push(decl(v, l === d || v.type !== "color" ? l : `light-dark(${l}, ${d})`));
        if (v.type !== "color" && l !== d) darkFloats.push(decl(v, d, "    "));
      } else L.push(decl(v, cssValue(v, v.values[c.modes[0]])));
    }
  }
  L.push(`  /* Effect styles */`);
  for (const s of SRC.effectStyles) L.push(`  ${effectName(s)}: ${shadowCss(s)};`);
  L.push(`  /* Anciens noms (v2), conservés le temps de la migration de l'app — ne pas utiliser dans du nouveau code */`);
  for (const [old, neu] of Object.entries(LEGACY)) if (!byCss.has(old) && byCss.has(neu)) L.push(`  ${old}: var(${neu});`);
  L.push(`}\n`);
  if (darkFloats.length) {
    const sel = (pre) => [`${pre}`, `${pre} [data-brand]`, `${pre} [data-module]`].join(",\n");
    L.push(
      `/* Valeurs numériques du mode sombre (light-dark() ne gère que les couleurs) */\n${sel('[data-theme="dark"]')} {\n${darkFloats.map((d) => d.slice(2)).join("\n")}\n}`,
    );
    L.push(`@media (prefers-color-scheme: dark) {\n  ${sel(':root:not([data-theme="light"])').replace(/\n/g, "\n  ")} {\n${darkFloats.join("\n")}\n  }\n}\n`);
  }

  L.push(`/* 5 · TYPOGRAPHIE — une classe par text style Figma : .type-<rôle> */`);
  for (const t of SRC.textStyles) {
    const WEIGHT = { Thin: 100, ExtraLight: 200, Light: 300, Regular: 400, Medium: 500, SemiBold: 600, Bold: 700, ExtraBold: 800, Black: 900 };
    const fallback = {
      fontFamily: FONT_STACK[t.fontName.family] ?? `"${t.fontName.family}", sans-serif`,
      fontSize: "inherit",
      lineHeight: "normal",
      fontWeight: WEIGHT[t.fontName.style.replace(/\s/g, "")] ?? 400,
      letterSpacing: "0",
    };
    const p = (k) => (t.bound[k] ? `var(${vars.get(aliasKey(t.bound[k])).css})` : fallback[k]);
    if (!t.bound.fontSize) continue; // style d'extraction sans taille liée : pas de classe
    const extra = [
      t.textCase === "UPPER" ? "  text-transform: uppercase;" : "",
      /tabular/i.test(t.description) ? "  font-variant-numeric: tabular-nums;" : "",
    ].filter(Boolean);
    L.push(
      `.type-${roleOf(t)} {\n  font-family: ${p("fontFamily")};\n  font-size: ${p("fontSize")};\n  line-height: ${p("lineHeight")};\n  font-weight: ${p("fontWeight")};\n  letter-spacing: ${p("letterSpacing")};${extra.length ? "\n" + extra.join("\n") : ""}\n}`,
    );
  }
  L.push(
    `\n/* 6 · FOCUS — anneau 2 px, décalé de 2 px */\n.focus-ring:focus-visible { outline: var(--border-width-focus) solid var(--focus-ring); outline-offset: 2px; }`,
  );
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 4. Tailwind v4
// ---------------------------------------------------------------------------
const TW_PREFIX = {
  surface: "surface",
  "surface-container": "surface-container",
  text: "fg",
  icon: "icon",
  border: "line",
  divider: "divider",
  action: "action",
  feedback: "feedback",
  focus: "focus",
  overlay: "overlay",
  data: "data",
  nutrition: "nutrition",
};
function buildTailwind() {
  const L = [`/* KVALIA OS — pont Tailwind v4. FICHIER GÉNÉRÉ. Importer après "tailwindcss" ; tokens.css doit être chargé. */`, `@theme inline {`];
  for (const v of [...vars.values()].filter((v) => v.coll.role === "theme" && v.type === "color")) {
    const [g, ...rest] = v.name.split("/");
    if (!TW_PREFIX[g]) continue;
    L.push(`  --color-${TW_PREFIX[g]}-${rest.join("-")}: var(${v.css});`);
  }
  // Anciennes classes (v2) → nouveaux rôles, le temps de migrer l'app (bg-surface-canvas → bg-surface-page…).
  for (const [old, neu] of Object.entries(LEGACY)) if (byCss.has(neu)) L.push(`  --color-${old.slice(2)}: var(${neu});`);
  // Préfixe distinct des noms DS (--shadow-1…) pour éviter toute référence circulaire.
  for (const s of SRC.effectStyles)
    L.push(
      `  --shadow-${slug(s.name)
        .replace(/^shadow-/, "step-")
        .replace(/^elevation-/, "")}: var(${effectName(s)});`,
    );
  const twNames = L.filter((l) => l.includes(": var(")).map((l) => l.trim().split(":")[0]);
  for (const n of twNames)
    if (byCss.has(n) || SRC.effectStyles.some((s) => effectName(s) === n)) fail(`Pont Tailwind : ${n} réutilise un nom du DS (référence circulaire)`);
  L.push(`}`);
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 5. TypeScript
// ---------------------------------------------------------------------------
/** Sérialise un littéral au format Biome (clés nues, virgules finales, retour à la ligne au-delà de 160 colonnes). */
function tsLiteral(v, indent = 0) {
  const pad = " ".repeat(indent);
  const inner = " ".repeat(indent + 2);
  if (Array.isArray(v)) {
    const items = v.map((x) => tsLiteral(x, indent + 2));
    const one = `[${items.join(", ")}]`;
    return one.length + indent < 120 && !one.includes("\n") ? one : `[\n${items.map((x) => `${inner}${x},`).join("\n")}\n${pad}]`;
  }
  if (v && typeof v === "object") {
    const items = Object.entries(v).map(([k, x]) => `${/^[a-zA-Z_$][\w$]*$/.test(k) ? k : JSON.stringify(k)}: ${tsLiteral(x, indent + 2)}`);
    return `{\n${items.map((x) => `${inner}${x},`).join("\n")}\n${pad}}`;
  }
  return JSON.stringify(v);
}

function buildTs() {
  const brands = BRANDS.map((b) => ({
    key: slug(b),
    label: b,
    primary: resolve(`${brandColl.index}:Light/action/primary`, { ...DEFAULT, brand: b }),
    onPrimary: resolve(`${brandColl.index}:Light/action/on-primary`, { ...DEFAULT, brand: b }),
  }));
  const semantic = [...vars.values()].filter((v) => v.coll.role !== "primitives" && v.coll.role !== "brand").map((v) => v.css);
  const effects = SRC.effectStyles.map(effectName);
  return `/* KVALIA OS — FICHIER GÉNÉRÉ par scripts/build-tokens.mjs depuis Figma. Ne pas éditer. */

export const brands = ${tsLiteral(brands)} as const;
export type BrandKey = (typeof brands)[number]["key"];
export const defaultBrand: BrandKey = ${JSON.stringify(slug(BRANDS[0]))};

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

export const typeRoles = ${tsLiteral(SRC.textStyles.map(roleOf))} as const;
export type TypeRole = (typeof typeRoles)[number];

/** Variables CSS consommables par l'UI (sémantiques + effets). Les primitives et la couche Brand sont exclues. */
export const tokenNames = ${tsLiteral([...semantic, ...effects])} as const;
export type TokenName = (typeof tokenNames)[number];

/** \`cssVar("--surface-page")\` → \`"var(--surface-page)"\`. */
export const cssVar = (name: TokenName, fallback?: string) => (fallback ? \`var(\${name}, \${fallback})\` : \`var(\${name})\`);
/** \`typeClass("title-md")\` → \`"type-title-md"\`. */
export const typeClass = (role: TypeRole) => \`type-\${role}\` as const;
`;
}

// ---------------------------------------------------------------------------
// 6. Contraste WCAG (rapport ; bloquant avec --strict)
// ---------------------------------------------------------------------------
const rgba = (h) => {
  const c = h.slice(1);
  return {
    r: parseInt(c.slice(0, 2), 16) / 255,
    g: parseInt(c.slice(2, 4), 16) / 255,
    b: parseInt(c.slice(4, 6), 16) / 255,
    a: c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1,
  };
};
const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
const lum = ({ r, g, b }) =>
  [r, g, b].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const SURF = ["surface/page", "surface-container/default", "surface-container/raised"];
const PAIRS = [
  ...["text/primary", "text/secondary", "text/tertiary", "text/brand", "text/link"].flatMap((f) => SURF.map((s) => [f, s, 4.5])),
  ["text/brand", "surface-container/brand-subtle", 4.5],
  ["text/on-brand", "action/primary", 4.5],
  ["text/on-brand", "action/primary-hover", 4.5],
  ["text/on-brand", "action/primary-pressed", 4.5],
  ["text/on-brand", "surface-container/brand", 4.5],
  ["icon/on-brand", "action/primary", 3],
  ["text/inverse", "surface-container/inverse", 4.5],
  ["text/inverse", "action/secondary", 4.5],
  ["text/primary", "surface-container/glass", 4.5],
  ["text/primary", "action/tertiary", 4.5],
  ...["success", "warning", "danger", "info"].flatMap((k) => [
    [`feedback/${k}-text`, "surface-container/default", 4.5],
    [`feedback/${k}-text`, `feedback/${k}-subtle`, 4.5],
  ]),
  ["focus/ring", "surface/page", 3],
  ["focus/ring", "surface-container/default", 3],
  ["border/strong", "surface-container/default", 3, "info"],
];
function buildContrast() {
  const themeColl = colls.find((c) => c.role === "theme");
  const key = (n) => `${themeColl.index}:${n}`;
  const rows = [];
  for (const brand of BRANDS)
    for (const theme of ["Light", "Dark"]) {
      const ctx = { brand, theme };
      const canvas = rgba(resolve(key("surface/page"), ctx));
      for (const [f, b, min, level] of PAIRS) {
        if (!vars.has(key(f)) || !vars.has(key(b))) continue;
        const bg = over(rgba(resolve(key(b), ctx)), canvas);
        const rt = ratio(over(rgba(resolve(key(f), ctx)), bg), bg);
        rows.push({ brand, theme, f, b, min, rt, ok: rt >= min, info: level === "info" });
      }
    }
  const failing = rows.filter((r) => !r.ok && !r.info);
  if (STRICT) for (const r of failing) fail(`Contraste ${r.brand}/${r.theme} : ${r.f} sur ${r.b} = ${r.rt.toFixed(2)} (< ${r.min})`);
  const L = [
    `# Rapport de contraste — KVALIA OS`,
    ``,
    `Généré par \`scripts/build-tokens.mjs\` depuis l'export Figma. ${rows.length} vérifications (${BRANDS.length} mini-apps × 2 thèmes). **Sous le seuil : ${failing.length}** · indicatif sous le seuil (⚠️) : ${rows.filter((r) => r.info && !r.ok).length}.`,
    ``,
    `Seuils : texte 4.5:1 (WCAG 1.4.3 AA), focus 3:1 (1.4.11). \`border/strong\` est indicatif (bordures décoratives). Couleurs translucides composées sur \`surface/page\`. \`--strict\` rend ces échecs bloquants.`,
    ``,
  ];
  if (failing.length) {
    L.push(`## À corriger dans Figma`, ``, `| Mini-app | Thème | Texte / élément | Fond | Ratio | Min |`, `|---|---|---|---|---|---|`);
    for (const r of failing) L.push(`| ${r.brand} | ${r.theme} | \`${r.f}\` | \`${r.b}\` | **${r.rt.toFixed(2)}** | ${r.min} |`);
    L.push("");
  }
  L.push(`## Détail`, ``, `| Paire | Min | ${BRANDS.flatMap((b) => [`${b} L`, `${b} D`]).join(" | ")} |`, `|---|---|${BRANDS.map(() => "---|---|").join("")}`);
  for (const [f, b, min] of PAIRS) {
    const cells = BRANDS.flatMap((br) =>
      ["Light", "Dark"].map((th) => {
        const r = rows.find((x) => x.brand === br && x.theme === th && x.f === f && x.b === b);
        return r ? `${r.ok ? "" : r.info ? "⚠️ " : "❌ "}${r.rt.toFixed(1)}` : "—";
      }),
    );
    L.push(`| \`${f}\` / \`${b}\` | ${min} | ${cells.join(" | ")} |`);
  }
  return { md: L.join("\n") + "\n", failing: failing.length, total: rows.filter((r) => !r.info).length };
}

// ---------------------------------------------------------------------------
// 7. Exécution
// ---------------------------------------------------------------------------
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) :\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
const contrast = buildContrast();
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) :\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
const outputs = { "src/tokens.css": buildCss(), "src/tailwind.css": buildTailwind(), "src/tokens.gen.ts": buildTs(), "tokens/CONTRAST.md": contrast.md };
const stats = {
  variables: vars.size,
  collections: colls.map((c) => `${c.name} (${c.modes.length})`),
  textStyles: SRC.textStyles.length,
  effectStyles: SRC.effectStyles.length,
  contrast: `${contrast.total - contrast.failing}/${contrast.total} OK`,
};
if (CHECK) {
  const stale = Object.entries(outputs)
    .filter(([f, c]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), "utf8") !== c)
    .map(([f]) => f);
  if (stale.length) {
    console.error(`✗ Sorties périmées : ${stale.join(", ")} — lancer \`pnpm --filter @kvalia/ui tokens\``);
    process.exit(1);
  }
  console.log("✓ tokens valides et sorties à jour", stats);
} else {
  for (const [f, c] of Object.entries(outputs)) fs.writeFileSync(path.join(ROOT, f), c);
  console.log(`✓ ${Object.keys(outputs).length} fichiers générés`, stats);
}
