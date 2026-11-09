/*
  KVALIA OS — export des variables et styles du fichier Figma « Kvalia Design System ».
  Figma est la source de vérité. Ce script produit exactement le contenu de tokens/figma-variables.json.

  Usage : exécuter dans le fichier Figma via le MCP `use_figma` (ou un plugin type Scripter),
  copier le JSON retourné dans packages/ui/tokens/figma-variables.json, puis `pnpm --filter @kvalia/ui tokens`.
  (L'API REST « variables » de Figma est réservée au plan Enterprise, d'où ce passage par le Plugin API.)

  Format d'une variable : [nom, type (C|F|S|B), scopes "A,B", valeur | [valeur par mode], codeSyntax WEB | 0, description | 0]
  Alias : "@<index de collection>:<nom de variable>". Couleur : "#rrggbb" ou "#rrggbbaa".
*/
const colls = await figma.variables.getLocalVariableCollectionsAsync();
const vars = await figma.variables.getLocalVariablesAsync();
const byId = Object.fromEntries(vars.map((v) => [v.id, v]));
const cIdx = Object.fromEntries(colls.map((c, i) => [c.id, i]));
const hx = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
const ref = (id) => { const t = byId[id]; return t ? `@${cIdx[t.variableCollectionId]}:${t.name}` : `@?:${id}`; };
const enc = (val) => {
  if (val && val.type === "VARIABLE_ALIAS") return ref(val.id);
  if (val && typeof val === "object" && "r" in val) return "#" + hx(val.r) + hx(val.g) + hx(val.b) + (val.a !== undefined && val.a < 1 ? hx(val.a) : "");
  return typeof val === "number" ? Math.round(val * 10000) / 10000 : val;
};
const bound = (o) => (o ? Object.fromEntries(Object.entries(o).map(([k, a]) => [k, Array.isArray(a) ? a.map((x) => ref(x.id)) : ref(a.id)])) : {});
return {
  $source: `figma:${figma.fileKey ?? "Wsysc6DJl1WLzN7do7Ujjl"}`,
  collections: colls.map((c) => ({
    name: c.name,
    modes: c.modes.map((m) => m.name),
    variables: vars.filter((v) => v.variableCollectionId === c.id).map((v) => {
      const vals = c.modes.map((m) => enc(v.valuesByMode[m.modeId]));
      return [v.name, v.resolvedType[0], v.scopes.join(","), c.modes.length === 1 ? vals[0] : vals, v.codeSyntax.WEB || 0, v.description || 0];
    }),
  })),
  textStyles: (await figma.getLocalTextStylesAsync()).map((s) => ({ name: s.name, description: s.description, fontName: { family: s.fontName.family, style: s.fontName.style }, textCase: s.textCase, bound: bound(s.boundVariables) })),
  effectStyles: (await figma.getLocalEffectStylesAsync()).map((s) => ({
    name: s.name, description: s.description,
    effects: s.effects.map((e) => ({ type: e.type, color: e.color ? enc(e.color) : null, x: e.offset?.x ?? 0, y: e.offset?.y ?? 0, blur: e.radius, spread: e.spread ?? 0, bound: bound(e.boundVariables) })),
  })),
};
