#!/usr/bin/env node
/**
 * KVALIA OS — build des design tokens (zéro dépendance).
 *
 * Source de vérité : packages/ui/tokens/*.json (format DTCG + modes, voir DESIGN_SYSTEM.md §2).
 * Sorties (générées, ne pas éditer à la main) :
 *   src/tokens.css          variables CSS multi-brand × multi-thème + utilitaires typo
 *   src/tailwind.css        pont @theme Tailwind v4 → classes bg-surface, text-fg-secondary…
 *   src/tokens.gen.ts       métadonnées typées (brands, modes, noms de tokens)
 *   figma/variables.json    payload Figma (collections, modes, alias, scopes, code syntax, styles)
 *   figma/import.js         script Plugin API prêt à exécuter (use_figma / Scripter)
 *   tokens/CONTRAST.md      rapport de contraste WCAG pour chaque mini-app × thème
 *
 * Le build ÉCHOUE si : référence cassée, couche violée, type incohérent, mode manquant,
 * dépendance brand dans un token qui varie par mode, ou contraste AA non respecté.
 *
 * Usage : node scripts/build-tokens.mjs [--check]   (--check : valide sans écrire)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CHECK_ONLY = process.argv.includes("--check");
const PREFIX = "kv";

// ---------------------------------------------------------------------------
// 1. Chargement
// ---------------------------------------------------------------------------
/** Ordre = ordre des couches. Une couche ne peut référencer que les couches autorisées. */
const LAYERS = [
  { file: "primitives", ctx: null, may: [] },
  { file: "brand", ctx: "brand", may: ["primitives"] },
  { file: "theme", ctx: "theme", may: ["primitives", "brand"] },
  { file: "layout", ctx: "density", may: ["primitives", "brand"] },
  { file: "typography", ctx: "typescale", may: ["primitives", "brand"] },
  { file: "motion", ctx: "motion", may: ["primitives"] },
  { file: "effects", ctx: null, may: ["primitives", "theme"] },
  { file: "components", ctx: null, may: ["theme", "layout", "typography", "motion", "effects"] },
];

const errors = [];
const fail = (msg) => errors.push(msg);

const collections = {}; // file -> { name, modes, description, meta }
const tokens = new Map(); // path -> token

for (const layer of LAYERS) {
  const json = JSON.parse(fs.readFileSync(path.join(ROOT, "tokens", `${layer.file}.json`), "utf8"));
  const coll = { file: layer.file, name: json.$collection, modes: json.$modes, description: json.$description, meta: json.$meta, ctx: layer.ctx, may: layer.may };
  collections[layer.file] = coll;
  const walk = (node, p) => {
    if (node && typeof node === "object" && "$value" in node) {
      const id = p.join(".");
      if (tokens.has(id)) fail(`Token dupliqué : ${id}`);
      tokens.set(id, { id, path: p, coll, type: node.$type, description: node.$description, values: normalizeValues(node, coll, id) });
      return;
    }
    for (const [k, v] of Object.entries(node)) if (!k.startsWith("$")) walk(v, [...p, k]);
  };
  walk(json, []);
}

function normalizeValues(node, coll, id) {
  const v = node.$value;
  const isModeMap = v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).every((k) => coll.modes.includes(k));
  if (isModeMap) {
    for (const m of coll.modes) if (!(m in v)) fail(`${id} : mode « ${m} » manquant`);
    return v;
  }
  return Object.fromEntries(coll.modes.map((m) => [m, v]));
}

const isRef = (v) => typeof v === "string" && /^\{[^}]+\}$/.test(v);
const refId = (v) => v.slice(1, -1);

// ---------------------------------------------------------------------------
// 2. Validation structurelle
// ---------------------------------------------------------------------------
const refsOf = (t) => {
  const out = [];
  for (const val of Object.values(t.values)) {
    if (isRef(val)) out.push(refId(val));
    if (Array.isArray(val)) for (const layer of val) if (layer && isRef(layer.color)) out.push(refId(layer.color));
  }
  return out;
};

for (const t of tokens.values()) {
  for (const r of refsOf(t)) {
    const target = tokens.get(r);
    if (!target) { fail(`${t.id} → {${r}} : référence introuvable`); continue; }
    if (target.coll.file !== t.coll.file && !t.coll.may.includes(target.coll.file))
      fail(`${t.id} (${t.coll.name}) → ${r} (${target.coll.name}) : couche interdite`);
    if (t.type !== "shadow" && target.type !== t.type)
      fail(`${t.id} (${t.type}) → ${r} (${target.type}) : type incohérent`);
  }
}

/** Le token dépend-il (transitivement) de la couche Brand ? */
const brandDep = new Map();
function dependsOnBrand(id) {
  if (brandDep.has(id)) return brandDep.get(id);
  const t = tokens.get(id);
  brandDep.set(id, false);
  const res = !!t && (t.coll.file === "brand" || refsOf(t).some(dependsOnBrand));
  brandDep.set(id, res);
  return res;
}
const variesByMode = (t) => new Set(Object.values(t.values).map((v) => JSON.stringify(v))).size > 1;

// Règle CSS : un token Layout/Typography/Motion qui varie par mode ne doit pointer QUE vers des primitives,
// sinon sa valeur serait figée à la frontière du mode (voir DESIGN_SYSTEM.md §3.4).
for (const t of tokens.values()) {
  if (["layout", "typography", "motion"].includes(t.coll.file) && variesByMode(t)) {
    for (const r of refsOf(t)) if (tokens.get(r)?.coll.file !== "primitives") fail(`${t.id} varie par mode mais pointe vers ${r} (non primitive)`);
  }
}

// ---------------------------------------------------------------------------
// 3. Résolution (pour CSS brut, contraste, Figma)
// ---------------------------------------------------------------------------
const DEFAULT_CTX = { brand: collections.brand.modes[0], theme: "light", density: "comfortable", typescale: "mobile", motion: "default" };
const modeFor = (t, ctx) => (t.coll.ctx ? ctx[t.coll.ctx] : t.coll.modes[0]);
function resolve(id, ctx = DEFAULT_CTX, depth = 0) {
  if (depth > 20) throw new Error(`Cycle sur ${id}`);
  const t = tokens.get(id);
  const v = t.values[modeFor(t, ctx)];
  return isRef(v) ? resolve(refId(v), ctx, depth + 1) : v;
}

// ---------------------------------------------------------------------------
// 4. Nommage
// ---------------------------------------------------------------------------
const cssName = (id) => `--${PREFIX}-${id.replace(/\./g, "-")}`;
const cssVarRef = (id) => `var(${cssName(id)})`;
/** Nom Figma : chemin en « / », racine redondante avec la collection retirée. */
const figmaName = (t) => {
  const p = [...t.path];
  if ({ brand: "brand", typography: "type", motion: "motion" }[t.coll.file] === p[0]) p.shift();
  return p.join("/");
};
const figmaMode = (m) => m.charAt(0).toUpperCase() + m.slice(1);
const CSS_SKIP = (t) => t.type === "string" && (t.path.includes("style") || t.path.at(-1) === "display-style");

const FONT_STACKS = {
  Inter: `"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
  "Space Grotesk": `"Space Grotesk", "Inter", ui-sans-serif, system-ui, sans-serif`,
  "Barlow Condensed": `"Barlow Condensed", "Arial Narrow", ui-sans-serif, system-ui, sans-serif`,
  Fraunces: `"Fraunces", ui-serif, Georgia, "Times New Roman", serif`,
  "JetBrains Mono": `"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace`,
};

function cssRaw(t, v) {
  switch (t.type) {
    case "color": return v;
    case "dimension": return `${v}px`;
    case "duration": return `${v}ms`;
    case "cubicBezier": return `cubic-bezier(${v.join(", ")})`;
    case "fontFamily": return FONT_STACKS[v] ?? `"${v}", sans-serif`;
    case "number": return t.path[1] === "tracking" ? `${v / 100}em` : String(v);
    case "fontWeight": return String(v);
    case "string": return v;
    default: throw new Error(`Type CSS non géré : ${t.type} (${t.id})`);
  }
}
const cssValue = (t, v) => {
  if (t.type === "shadow") return v.length ? v.map((l) => `${l.offsetX}px ${l.offsetY}px ${l.blur}px ${l.spread}px ${isRef(l.color) ? cssVarRef(refId(l.color)) : l.color}`).join(", ") : "none";
  return isRef(v) ? cssVarRef(refId(v)) : cssRaw(t, v);
};

// ---------------------------------------------------------------------------
// 5. CSS
// ---------------------------------------------------------------------------
const byColl = (file) => [...tokens.values()].filter((t) => t.coll.file === file && !CSS_SKIP(t));
const decl = (t, v, indent = "  ") => `${indent}${cssName(t.id)}: ${v};`;
const BOUNDARY = `:root,\n[data-brand],\n[data-module],\n[data-density],\n[data-motion]`;
const brandSel = (b) => `[data-brand="${b}"],\n[data-module="${b}"]`;

function buildCss() {
  const L = [];
  L.push(`/*\n  KVALIA OS — Design tokens. FICHIER GÉNÉRÉ par packages/ui/scripts/build-tokens.mjs — ne pas éditer.\n  Source : packages/ui/tokens/*.json · Doc : packages/ui/DESIGN_SYSTEM.md\n\n  Axes (attributs HTML, combinables et imbricables) :\n    data-brand="${collections.brand.modes.join("|")}"   identité de la mini-app\n    data-theme="light|dark"            thème (absent = suit le système)\n    data-density="compact"             densité (absent = comfortable)\n    data-motion="reduced"              animations réduites (aussi via prefers-reduced-motion)\n*/\n`);

  // Primitives
  L.push(`/* 1 · PRIMITIVES ─ valeurs brutes, ne jamais consommer directement dans l'UI */`);
  L.push(`:root {`);
  for (const t of byColl("primitives")) L.push(decl(t, cssValue(t, t.values.value)));
  L.push(`}\n`);

  // Brand
  L.push(`/* 2 · BRAND ─ un bloc par mini-app (${collections.brand.modes[0]} par défaut) */`);
  for (const [i, b] of collections.brand.modes.entries()) {
    L.push(`${i === 0 ? ":root,\n" : ""}${brandSel(b)} {`);
    for (const t of byColl("brand")) L.push(decl(t, cssValue(t, t.values[b])));
    L.push(`}`);
  }
  L.push("");

  // Thème : color-scheme
  L.push(`/* 3 · THEME ─ light-dark() : le thème suit color-scheme, imbricable sans conflit avec data-brand */`);
  L.push(`:root { color-scheme: light dark; }`);
  L.push(`[data-theme="light"] { color-scheme: light; }`);
  L.push(`[data-theme="dark"] { color-scheme: dark; }`);
  // NB : le thème par défaut d'une mini-app (brands[].defaultTheme, ex. Sport = dark) n'est PAS appliqué en CSS :
  // [data-brand] sert aussi sur de petits éléments (item de nav, chip) qui doivent garder le thème de leur parent.
  // C'est le shell de la mini-app qui pose data-theme sur son conteneur racine (voir DESIGN_SYSTEM.md §4.2).
  L.push("");

  // Tokens à mode variable (densité, typescale, motion) : primitives uniquement → héritage sûr
  const moded = (file) => byColl(file).filter(variesByMode);
  const modeBlock = (file, mode, selector) => {
    const list = moded(file);
    if (!list.length) return;
    L.push(`${selector} {`);
    for (const t of list) L.push(decl(t, cssValue(t, t.values[mode]), selector.startsWith("@") ? "    " : "  "));
    L.push(selector.startsWith("@") ? "  }\n}" : "}");
  };
  L.push(`/* 4 · LAYOUT ─ densité */`);
  modeBlock("layout", "comfortable", ":root");
  modeBlock("layout", "compact", `[data-density="compact"]`);
  L.push(`\n/* 5 · TYPOGRAPHY ─ échelle mobile, desktop ≥ 1024px */`);
  modeBlock("typography", "mobile", ":root");
  L.push(`@media (min-width: 1024px) {\n  :root {`);
  for (const t of moded("typography")) L.push(decl(t, cssValue(t, t.values.desktop), "    "));
  L.push(`  }\n}`);
  L.push(`\n/* 6 · MOTION ─ default / reduced */`);
  modeBlock("motion", "default", ":root");
  const reduced = moded("motion").map((t) => decl(t, cssValue(t, t.values.reduced), "    "));
  L.push(`@media (prefers-reduced-motion: reduce) {\n  :root {\n${reduced.join("\n")}\n  }\n}`);
  L.push(`[data-motion="reduced"] {\n${reduced.map((l) => l.slice(2)).join("\n")}\n}\n`);

  // Sémantique + composants invariants : redéclarés à chaque frontière
  L.push(`/* 7 · SÉMANTIQUE + COMPOSANTS ─ redéclarés à chaque frontière (data-brand, data-density…)\n   pour que var() se résolve avec les valeurs de la mini-app la plus proche. */`);
  L.push(`${BOUNDARY} {`);
  for (const file of ["theme", "layout", "typography", "motion", "effects", "components"]) {
    const list = byColl(file).filter((t) => !variesByMode(t) || file === "theme");
    if (!list.length) continue;
    L.push(`  /* ${collections[file].name} */`);
    for (const t of list) {
      if (file === "theme") {
        const { light, dark } = t.values;
        L.push(decl(t, light === dark ? cssValue(t, light) : `light-dark(${cssValue(t, light)}, ${cssValue(t, dark)})`));
      } else L.push(decl(t, cssValue(t, t.values[t.coll.modes[0]])));
    }
  }
  L.push(`}\n`);

  // Utilitaires typo
  L.push(`/* 8 · UTILITAIRES TYPO ─ .kv-type-<rôle> */`);
  const roles = [...new Set([...tokens.values()].filter((t) => t.coll.file === "typography").map((t) => t.path[1]))];
  for (const role of roles) {
    const v = (k) => cssVarRef(`type.${role}.${k}`);
    const extra = role.startsWith("numeric") ? "\n  font-variant-numeric: tabular-nums;" : role === "overline" ? "\n  text-transform: uppercase;" : "";
    L.push(`.kv-type-${role} {\n  font-family: ${v("family")};\n  font-size: ${v("size")};\n  line-height: ${v("line-height")};\n  font-weight: ${v("weight")};\n  letter-spacing: ${v("tracking")};${extra}\n}`);
  }
  L.push(`\n/* 9 · FOCUS ─ anneau unique pour tout élément focusable au clavier */\n.kv-focus-ring:focus-visible,\n[data-kv-focus]:focus-visible {\n  outline: none;\n  box-shadow: var(${cssName("focus.ring")});\n}`);
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 6. Tailwind v4 bridge
// ---------------------------------------------------------------------------
function buildTailwind() {
  const L = [`/* KVALIA OS — pont Tailwind v4. FICHIER GÉNÉRÉ. Importer après "tailwindcss" et tokens.css. */`, `@theme inline {`];
  for (const t of byColl("theme")) {
    const [group, ...rest] = t.path;
    const name = rest.join("-");
    const tw = { bg: name, text: `fg-${name}`, icon: `icon-${name}`, border: `line-${name}`, effect: `effect-${name}` }[group];
    L.push(`  --color-${tw}: ${cssVarRef(t.id)};`);
  }
  for (const k of ["none", "xs", "sm", "control", "container", "pill"]) L.push(`  --radius-${k}: ${cssVarRef(`radius.${k}`)};`);
  for (const k of ["1", "2", "3", "4"]) L.push(`  --shadow-elevation-${k}: ${cssVarRef(`elevation.${k}`)};`);
  L.push(`  --font-sans: ${cssVarRef("font.family.sans")};`, `  --font-display: ${cssVarRef("brand.font.display")};`, `  --font-mono: ${cssVarRef("font.family.mono")};`);
  for (const t of byColl("motion").filter((t) => t.path[1] === "easing")) L.push(`  --ease-${t.path[2]}: ${cssVarRef(t.id)};`);
  L.push(`}`);
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// 7. TypeScript
// ---------------------------------------------------------------------------
function buildTs() {
  const brands = collections.brand.modes.map((k) => ({ key: k, ...collections.brand.meta[k], accent: resolve("brand.accent.solid", { ...DEFAULT_CTX, brand: k }) }));
  const semantic = [...tokens.values()].filter((t) => !["primitives", "brand"].includes(t.coll.file) && !CSS_SKIP(t)).map((t) => cssName(t.id));
  return `/* KVALIA OS — FICHIER GÉNÉRÉ par scripts/build-tokens.mjs. Ne pas éditer. */

export const brands = ${JSON.stringify(brands, null, 2)} as const;
export type BrandKey = (typeof brands)[number]["key"];

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];
export const densities = ${JSON.stringify(collections.layout.modes)} as const;
export type Density = (typeof densities)[number];

export const typeRoles = ${JSON.stringify([...new Set([...tokens.values()].filter((t) => t.coll.file === "typography").map((t) => t.path[1]))])} as const;
export type TypeRole = (typeof typeRoles)[number];

/** Noms CSS des tokens consommables par l'UI (sémantiques + composants). Les primitives sont volontairement exclues. */
export const tokenNames = ${JSON.stringify(semantic)} as const;
export type TokenName = (typeof tokenNames)[number];

/** \`cssVar("--kv-bg-surface")\` → \`"var(--kv-bg-surface)"\`, typé. */
export const cssVar = (name: TokenName, fallback?: string) => (fallback ? \`var(\${name}, \${fallback})\` : \`var(\${name})\`);

/** Classe utilitaire typo : \`typeClass("title-md")\` → \`"kv-type-title-md"\`. */
export const typeClass = (role: TypeRole) => \`kv-type-\${role}\` as const;
`;
}

// ---------------------------------------------------------------------------
// 8. Figma payload + script d'import
// ---------------------------------------------------------------------------
const SCOPES = {
  theme: { bg: ["FRAME_FILL", "SHAPE_FILL"], text: ["TEXT_FILL"], icon: ["SHAPE_FILL", "STROKE_COLOR"], border: ["STROKE_COLOR"], effect: ["EFFECT_COLOR"] },
};
function scopesFor(t) {
  const [g, , ] = t.path;
  const last = t.path.at(-1);
  switch (t.coll.file) {
    case "primitives": case "brand": case "motion": return [];
    case "theme": return SCOPES.theme[g] ?? [];
    case "layout":
      if (g === "space" || last === "gutter" || last === "section-gap") return ["GAP"];
      if (g === "radius") return ["CORNER_RADIUS"];
      if (g === "border-width") return ["STROKE_FLOAT"];
      return ["WIDTH_HEIGHT"];
    case "typography": return { family: ["FONT_FAMILY"], size: ["FONT_SIZE"], "line-height": ["LINE_HEIGHT"], weight: ["FONT_WEIGHT"], style: ["FONT_STYLE"], tracking: ["LETTER_SPACING"] }[last];
    case "effects": return g === "blur" ? ["EFFECT_FLOAT"] : g === "opacity" ? ["OPACITY"] : [];
    case "components":
      if (t.type === "color") {
        if (/^(bg|bg-.*|indicator|track|fill|scrim|.*-bg)$/.test(last)) return ["FRAME_FILL", "SHAPE_FILL"];
        if (/border|divider|handle/.test(last)) return ["STROKE_COLOR"];
        if (last === "accent") return ["SHAPE_FILL", "STROKE_COLOR"];
        return ["TEXT_FILL"];
      }
      if (last === "radius") return ["CORNER_RADIUS"];
      if (/height|size/.test(last)) return ["WIDTH_HEIGHT"];
      return ["GAP"];
  }
  return [];
}
const FIGMA_TYPE = { color: "COLOR", dimension: "FLOAT", number: "FLOAT", fontWeight: "FLOAT", duration: "FLOAT", fontFamily: "STRING", string: "STRING", cubicBezier: "STRING" };
function figmaValue(t, v) {
  if (isRef(v)) { const tg = tokens.get(refId(v)); return { alias: `${tg.coll.name}::${figmaName(tg)}` }; }
  if (t.type === "cubicBezier") return `cubic-bezier(${v.join(", ")})`;
  if (t.type === "number" && t.path[1] === "tracking") return v; // %
  return v;
}

function buildFigma() {
  const out = { $generated: "packages/ui/scripts/build-tokens.mjs", collections: [], textStyles: [], effectStyles: [] };
  for (const coll of Object.values(collections)) {
    const vars = [...tokens.values()].filter((t) => t.coll === coll && t.type !== "shadow").map((t) => ({
      name: figmaName(t),
      type: FIGMA_TYPE[t.type],
      scopes: scopesFor(t),
      web: CSS_SKIP(t) ? null : `var(${cssName(t.id)})`,
      description: t.description ?? "",
      values: Object.fromEntries(coll.modes.map((m) => [figmaMode(m), figmaValue(t, t.values[m])])),
    }));
    if (vars.length) out.collections.push({ name: coll.name, description: coll.description, modes: coll.modes.map(figmaMode), variables: vars });
  }
  const roles = [...new Set([...tokens.values()].filter((t) => t.coll.file === "typography").map((t) => t.path[1]))];
  for (const role of roles) {
    const tr = resolve(`type.${role}.tracking`);
    out.textStyles.push({ name: role.replace("-", "/"), role, tracking: tr, uppercase: role === "overline", bind: { fontFamily: `Typography::${role}/family`, fontStyle: `Typography::${role}/style`, fontSize: `Typography::${role}/size`, lineHeight: `Typography::${role}/line-height` }, fallback: { family: resolve(`type.${role}.family`), style: resolve(`type.${role}.style`), size: resolve(`type.${role}.size`), lineHeight: resolve(`type.${role}.line-height`) } });
  }
  for (const t of [...tokens.values()].filter((t) => t.type === "shadow")) {
    out.effectStyles.push({ name: t.path.join("/"), description: t.description ?? "", layers: t.values.value.map((l) => ({ ...l, color: `Theme::${figmaName(tokens.get(refId(l.color)))}` })) });
  }
  out.effectStyles.push({ name: "blur/glass", description: "Flou d'arrière-plan des barres translucides", backgroundBlur: resolve("blur.glass") });
  // Polices atteignables par les text styles, tous modes Brand confondus (à charger avant binding).
  const fonts = new Set();
  for (const brand of collections.brand.modes) for (const role of roles) fonts.add(JSON.stringify({ family: resolve(`type.${role}.family`, { ...DEFAULT_CTX, brand }), style: resolve(`type.${role}.style`, { ...DEFAULT_CTX, brand }) }));
  out.fonts = [...fonts].map((f) => JSON.parse(f));
  return out;
}

// ---------------------------------------------------------------------------
// 9. Contraste WCAG
// ---------------------------------------------------------------------------
const hexToRgba = (h) => { const c = h.slice(1); return { r: parseInt(c.slice(0, 2), 16) / 255, g: parseInt(c.slice(2, 4), 16) / 255, b: parseInt(c.slice(4, 6), 16) / 255, a: c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1 }; };
const over = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = ({ r, g, b }) => [r, g, b].map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)).reduce((s, c, i) => s + c * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const TEXT_BGS = ["bg.canvas", "bg.surface", "bg.surface-raised"];
const PAIRS = [
  ...["primary", "secondary", "tertiary", "accent", "link", "success", "warning", "danger", "info"].flatMap((f) => TEXT_BGS.map((b) => [`text.${f}`, b, 4.5])),
  ["text.accent", "bg.accent-subtle", 4.5], ["text.accent", "bg.accent-muted", 4.5], ["text.accent", "bg.selected", 4.5],
  ["text.on-accent", "bg.accent-solid", 4.5], ["text.on-accent", "bg.accent-solid-hover", 4.5], ["text.on-accent", "bg.accent-solid-pressed", 4.5],
  ["text.success", "bg.success-subtle", 4.5], ["text.warning", "bg.warning-subtle", 4.5], ["text.danger", "bg.danger-subtle", 4.5], ["text.info", "bg.info-subtle", 4.5],
  ["text.on-success", "bg.success-solid", 4.5], ["text.on-warning", "bg.warning-solid", 4.5], ["text.on-danger", "bg.danger-solid", 4.5], ["text.on-info", "bg.info-solid", 4.5],
  ["text.inverse", "bg.surface-inverse", 4.5], ["text.primary", "bg.surface-sunken", 4.5], ["text.secondary", "bg.glass", 4.5], ["text.accent", "bg.glass", 4.5],
  ...["primary", "secondary", "accent", "success", "warning", "danger", "info"].map((i) => [`icon.${i}`, "bg.surface", 3]),
  ["icon.on-accent", "bg.accent-solid", 3],
  ["border.focus", "bg.surface", 3], ["border.focus", "bg.canvas", 3], ["border.strong", "bg.surface", 3], ["border.danger", "bg.surface", 3],
];
function buildContrast() {
  const rows = [];
  let failures = 0;
  for (const brand of collections.brand.modes) for (const theme of ["light", "dark"]) {
    const ctx = { ...DEFAULT_CTX, brand, theme };
    const canvas = hexToRgba(resolve("bg.canvas", ctx));
    const flat = (id) => over(hexToRgba(resolve(id, ctx)), canvas);
    for (const [fg, bg, min] of PAIRS) {
      const bgc = flat(bg);
      const rt = ratio(over(hexToRgba(resolve(fg, ctx)), bgc), bgc);
      const ok = rt >= min;
      if (!ok) { failures++; fail(`Contraste ${brand}/${theme} : ${fg} sur ${bg} = ${rt.toFixed(2)} (< ${min})`); }
      rows.push({ brand, theme, fg, bg, rt, min, ok });
    }
  }
  const L = [`# Rapport de contraste — KVALIA OS`, ``, `Généré par \`scripts/build-tokens.mjs\`. ${PAIRS.length} paires × ${collections.brand.modes.length} mini-apps × 2 thèmes = ${rows.length} vérifications. Échecs : **${failures}**.`, ``, `Seuils : texte 4.5:1 (WCAG 1.4.3 AA), icônes / bordures fonctionnelles / focus 3:1 (WCAG 1.4.11). Les couleurs translucides sont composées sur \`bg.canvas\`.`, ``];
  for (const brand of collections.brand.modes) {
    L.push(`## ${collections.brand.meta[brand].label} (\`${brand}\`)`, ``, `| Paire | Min | Light | Dark |`, `|---|---|---|---|`);
    for (const [fg, bg, min] of PAIRS) {
      const l = rows.find((r) => r.brand === brand && r.theme === "light" && r.fg === fg && r.bg === bg);
      const d = rows.find((r) => r.brand === brand && r.theme === "dark" && r.fg === fg && r.bg === bg);
      const f = (r) => `${r.ok ? "✅" : "❌"} ${r.rt.toFixed(2)}`;
      L.push(`| \`${fg}\` / \`${bg}\` | ${min} | ${f(l)} | ${f(d)} |`);
    }
    L.push("");
  }
  return L.join("\n");
}

// ---------------------------------------------------------------------------
// 9b. Données du spécimen (specimen/index.html)
// ---------------------------------------------------------------------------
function buildSpecimenData() {
  const all = [...tokens.values()];
  const group = (file) => all.filter((t) => t.coll.file === file && !CSS_SKIP(t)).map((t) => ({ id: t.id, css: cssName(t.id), desc: t.description ?? "", values: Object.fromEntries(Object.entries(t.values).map(([m, v]) => [m, t.type === "shadow" ? "composite" : isRef(v) ? refId(v) : v])) }));
  const hues = [...new Set(all.filter((t) => t.coll.file === "primitives" && t.path[0] === "color" && t.path[1] !== "alpha").map((t) => t.path[1]))];
  const data = {
    brands: collections.brand.modes.map((k) => ({ key: k, ...collections.brand.meta[k] })),
    hues: hues.map((h) => ({ name: h, steps: all.filter((t) => t.path[0] === "color" && t.path[1] === h).map((t) => ({ step: t.path[2], hex: t.values.value, css: cssName(t.id) })) })),
    theme: group("theme"), layout: group("layout"), typography: group("typography"), motion: group("motion"), effects: group("effects"), components: group("components"),
    stats: Object.fromEntries(Object.values(collections).map((c) => [c.name, { modes: c.modes, count: all.filter((t) => t.coll === c).length }])),
  };
  return `/* FICHIER GÉNÉRÉ par scripts/build-tokens.mjs */\nwindow.KV = ${JSON.stringify(data)};\n`;
}

// ---------------------------------------------------------------------------
// 10. Exécution
// ---------------------------------------------------------------------------
const contrast = errors.length ? "" : buildContrast();
if (errors.length) {
  console.error(`✗ ${errors.length} erreur(s) dans les tokens :\n  - ${errors.join("\n  - ")}`);
  process.exit(1);
}
const figma = buildFigma();
const outputs = {
  "src/tokens.css": buildCss(),
  "src/tailwind.css": buildTailwind(),
  "src/tokens.gen.ts": buildTs(),
  "figma/variables.json": JSON.stringify(figma, null, 2) + "\n",
  "figma/import.js": fs.readFileSync(path.join(ROOT, "figma/import.template.js"), "utf8").replace("const P = __PAYLOAD__;", () => `const P = ${JSON.stringify(figma)};`),
  "tokens/CONTRAST.md": contrast + "\n",
  "specimen/data.js": buildSpecimenData(),
};
// Morceaux < 45 Ko pour use_figma : variables découpées par collection (ordre des couches), styles à la fin.
{
  const tpl = fs.readFileSync(path.join(ROOT, "figma/import.template.js"), "utf8");
  const LIMIT = 45000 - tpl.length;
  // Compactage
  const C = figma.collections.map((c) => c.name);
  const S = [];
  const prefix = { Brand: "brand-", Typography: "type-", Motion: "motion-" };
  const enc = (val) => (val && typeof val === "object" && "alias" in val ? `@${C.indexOf(val.alias.split("::")[0])}:${val.alias.split("::")[1]}` : val);
  const compact = figma.collections.map((c) => ({
    name: c.name, description: c.description, modes: c.modes, prefix: prefix[c.name] ?? "",
    variables: c.variables.map((v) => {
      const sk = JSON.stringify(v.scopes);
      if (!S.some((x) => JSON.stringify(x) === sk)) S.push(v.scopes);
      const vals = c.modes.map((m) => enc(v.values[m]));
      const derived = `var(--kv-${prefix[c.name] ?? ""}${v.name.replace(/\//g, "-")})`;
      if (v.web && v.web !== derived) throw new Error(`code syntax non dérivable : ${v.name}`);
      const row = [v.name, v.type[0], S.findIndex((x) => JSON.stringify(x) === sk), c.modes.length === 1 ? vals[0] : vals, v.description || 0, v.web ? 0 : 1];
      while (row.length > 4 && !row.at(-1)) row.pop();
      return row;
    }),
  }));
  const chunks = [];
  const fresh = () => ({ C, S, collections: [] });
  let cur = fresh();
  const size = (o) => JSON.stringify(o).length;
  for (const c of compact) {
    let part = { ...c, variables: [] };
    for (const v of c.variables) {
      part.variables.push(v);
      if (size(cur) + size(part) > LIMIT) {
        part.variables.pop();
        if (part.variables.length) cur.collections.push(part);
        chunks.push(cur); cur = fresh(); part = { ...c, variables: [v] };
      }
    }
    cur.collections.push(part);
  }
  chunks.push(cur);
  chunks.push({ textStyles: figma.textStyles, effectStyles: figma.effectStyles, fonts: figma.fonts });
  for (const f of fs.existsSync(path.join(ROOT, "figma/chunks")) ? fs.readdirSync(path.join(ROOT, "figma/chunks")) : []) if (!CHECK_ONLY) fs.rmSync(path.join(ROOT, "figma/chunks", f));
  chunks.forEach((ch, i) => { outputs[`figma/chunks/import-${String(i + 1).padStart(2, "0")}.js`] = tpl.replace("const P = __PAYLOAD__;", () => `const P = ${JSON.stringify(ch)};`); });
}
const stats = Object.fromEntries(Object.values(collections).map((c) => [c.name, [...tokens.values()].filter((t) => t.coll === c).length]));
if (CHECK_ONLY) {
  const stale = Object.entries(outputs).filter(([f, c]) => !fs.existsSync(path.join(ROOT, f)) || fs.readFileSync(path.join(ROOT, f), "utf8") !== c).map(([f]) => f);
  if (stale.length) { console.error(`✗ Fichiers générés périmés : ${stale.join(", ")} — lancer \`pnpm --filter @kvalia/ui tokens\``); process.exit(1); }
  console.log(`✓ tokens valides et sorties à jour`, stats);
} else {
  for (const [f, c] of Object.entries(outputs)) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), c); }
  console.log(`✓ ${tokens.size} tokens · ${Object.keys(outputs).length} fichiers générés`, stats);
}
