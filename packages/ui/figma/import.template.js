/*
  KVALIA OS — import des tokens dans Figma (Plugin API).
  Template : `__PAYLOAD__` est remplacé par figma/variables.json au build → figma/import.js.

  Exécution : coller figma/import.js dans un plugin type Scripter, ou exécuter figma/chunks/*.js dans l'ordre
  via le MCP Figma `use_figma` (limite de taille par appel). Les alias vers des variables créées par un morceau
  précédent sont résolus depuis le fichier.
  Idempotent : collections, modes, variables et styles sont retrouvés par nom puis mis à jour.
  Ordre : collections → modes → variables (pass 1) → valeurs/alias (pass 2) → text styles → effect styles.
*/
const P = __PAYLOAD__;

const hex = (h) => {
  const c = h.replace("#", "");
  return { r: parseInt(c.slice(0, 2), 16) / 255, g: parseInt(c.slice(2, 4), 16) / 255, b: parseInt(c.slice(4, 6), 16) / 255, a: c.length === 8 ? parseInt(c.slice(6, 8), 16) / 255 : 1 };
};

const report = { collections: {}, created: 0, updated: 0, textStyles: 0, effectStyles: 0, warnings: [] };
const existingColls = await figma.variables.getLocalVariableCollectionsAsync();
const existingVars = await figma.variables.getLocalVariablesAsync();
const byKey = new Map(); // "Collection::name" -> Variable
const collObjs = new Map();
const lookup = (key) => {
  if (byKey.has(key)) return byKey.get(key);
  const [cName, vName] = key.split("::");
  const coll = existingColls.find((c) => c.name === cName);
  const v = coll && existingVars.find((x) => x.variableCollectionId === coll.id && x.name === vName);
  if (v) byKey.set(key, v);
  return v;
};

P.collections = P.collections ?? [];
// Format compact (morceaux use_figma) : [nom, C|F|S, indexScopes, valeur(s), description?, sansCodeSyntax?]
// alias compact : "@<indexCollection>:<nom>" ; code syntax WEB dérivé de c.prefix + nom.
const dec = (val) => (typeof val === "string" && val[0] === "@" ? { alias: `${P.C[+val.slice(1, val.indexOf(":"))]}::${val.slice(val.indexOf(":") + 1)}` } : val);
for (const c of P.collections) {
  c.variables = c.variables.map((v) => (!Array.isArray(v) ? v : {
    name: v[0], type: { C: "COLOR", F: "FLOAT", S: "STRING" }[v[1]], scopes: P.S[v[2]], description: v[4] || "",
    web: v[5] ? null : `var(--kv-${c.prefix}${v[0].replace(/\//g, "-")})`,
    values: Object.fromEntries(c.modes.map((m, i) => [m, dec(c.modes.length === 1 ? v[3] : v[3][i])])),
  }));
}
// 1. Collections + modes
for (const c of P.collections) {
  let coll = existingColls.find((x) => x.name === c.name) ?? figma.variables.createVariableCollection(c.name);
  for (const [i, m] of c.modes.entries()) {
    if (coll.modes.some((x) => x.name === m)) continue;
    if (i === 0 && coll.modes.length === 1 && !c.modes.includes(coll.modes[0].name)) coll.renameMode(coll.modes[0].modeId, m);
    else coll.addMode(m); // > 4 modes requiert un plan Organization / Enterprise
  }
  collObjs.set(c.name, coll);
  report.collections[c.name] = { modes: c.modes.length, variables: c.variables.length };
}

// 2. Variables (pass 1 : existence, type, scopes, code syntax)
for (const c of P.collections) {
  const coll = collObjs.get(c.name);
  for (const v of c.variables) {
    let variable = existingVars.find((x) => x.variableCollectionId === coll.id && x.name === v.name);
    if (variable && variable.resolvedType !== v.type) { variable.remove(); variable = null; }
    if (!variable) { variable = figma.variables.createVariable(v.name, coll, v.type); report.created++; } else report.updated++;
    if (v.type !== "BOOLEAN") variable.scopes = v.scopes;
    if (v.web) variable.setVariableCodeSyntax("WEB", v.web);
    variable.description = v.description || "";
    variable.hiddenFromPublishing = v.scopes.length === 0;
    byKey.set(`${c.name}::${v.name}`, variable);
  }
}

// 3. Valeurs et alias (pass 2)
for (const c of P.collections) {
  const coll = collObjs.get(c.name);
  for (const v of c.variables) {
    const variable = byKey.get(`${c.name}::${v.name}`);
    for (const [modeName, val] of Object.entries(v.values)) {
      const modeId = coll.modes.find((m) => m.name === modeName).modeId;
      if (val && typeof val === "object" && "alias" in val) {
        const target = lookup(val.alias);
        if (!target) { report.warnings.push(`alias introuvable ${v.name} → ${val.alias}`); continue; }
        variable.setValueForMode(modeId, figma.variables.createVariableAlias(target));
      } else {
        variable.setValueForMode(modeId, v.type === "COLOR" ? hex(val) : val);
      }
    }
  }
}

// 4. Text styles (liés aux variables Typography → suivent Brand + Mobile/Desktop)
// Toutes les polices atteignables par les variables (tous modes) doivent être chargées avant le binding.
const fonts = new Set((P.fonts ?? []).map((f) => JSON.stringify(f)));
const loaded = new Set();
for (const f of fonts) {
  try { await figma.loadFontAsync(JSON.parse(f)); loaded.add(f); } catch (e) { report.warnings.push(`police indisponible : ${f}`); }
}
const localText = await figma.getLocalTextStylesAsync();
for (const t of P.textStyles ?? []) {
  const name = `kvalia/${t.name}`;
  const style = localText.find((s) => s.name === name) ?? figma.createTextStyle();
  style.name = name;
  const fb = JSON.stringify({ family: t.fallback.family, style: t.fallback.style });
  style.fontName = loaded.has(fb) ? JSON.parse(fb) : { family: "Inter", style: "Regular" };
  style.fontSize = t.fallback.size;
  style.lineHeight = { unit: "PIXELS", value: t.fallback.lineHeight };
  style.letterSpacing = { unit: "PERCENT", value: t.tracking };
  style.textCase = t.uppercase ? "UPPER" : "ORIGINAL";
  for (const [field, key] of Object.entries(t.bind)) {
    const variable = lookup(key);
    try { style.setBoundVariable(field, variable); } catch (e) { report.warnings.push(`bind ${name}.${field} : ${e.message}`); }
  }
  report.textStyles++;
}

// 5. Effect styles (couleurs d'ombre liées à Theme → s'adaptent au dark)
const localFx = await figma.getLocalEffectStylesAsync();
for (const e of P.effectStyles ?? []) {
  const name = `kvalia/${e.name}`;
  const style = localFx.find((s) => s.name === name) ?? figma.createEffectStyle();
  style.name = name;
  style.description = e.description;
  if (e.backgroundBlur != null) {
    style.effects = [{ type: "BACKGROUND_BLUR", blurType: "NORMAL", radius: e.backgroundBlur, visible: true }];
  } else {
    style.effects = e.layers.map((l) => {
      const variable = lookup(l.color);
      const base = { type: "DROP_SHADOW", color: { r: 0, g: 0, b: 0, a: 0.1 }, offset: { x: l.offsetX, y: l.offsetY }, radius: l.blur, spread: l.spread, visible: true, blendMode: "NORMAL", showShadowBehindNode: false };
      return variable ? figma.variables.setBoundVariableForEffect(base, "color", variable) : base;
    });
  }
  report.effectStyles++;
}

return report;
