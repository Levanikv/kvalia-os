/*
  KVALIA OS — import des tokens dans Figma (Plugin API).
  Template : `__PAYLOAD__` est remplacé par figma/variables.json au build → figma/import.js.

  Exécution : coller figma/import.js dans un plugin type Scripter, ou exécuter figma/chunks/*.js dans l'ordre
  via le MCP Figma `use_figma` (limite de taille par appel). Les alias vers des variables créées par un morceau
  précédent sont résolus depuis le fichier.
  Idempotent : collections, modes, variables et styles sont retrouvés par nom puis mis à jour.
  Ordre : collections → modes → variables (pass 1) → valeurs/alias (pass 2) → text styles → effect styles.
*/
const P = {"textStyles":[{"name":"display/lg","role":"display-lg","tracking":-2,"uppercase":false,"bind":{"fontFamily":"Typography::display-lg/family","fontStyle":"Typography::display-lg/style","fontSize":"Typography::display-lg/size","lineHeight":"Typography::display-lg/line-height"},"fallback":{"family":"Inter","style":"Bold","size":40,"lineHeight":48}},{"name":"display/md","role":"display-md","tracking":-2,"uppercase":false,"bind":{"fontFamily":"Typography::display-md/family","fontStyle":"Typography::display-md/style","fontSize":"Typography::display-md/size","lineHeight":"Typography::display-md/line-height"},"fallback":{"family":"Inter","style":"Bold","size":32,"lineHeight":40}},{"name":"headline/lg","role":"headline-lg","tracking":-1,"uppercase":false,"bind":{"fontFamily":"Typography::headline-lg/family","fontStyle":"Typography::headline-lg/style","fontSize":"Typography::headline-lg/size","lineHeight":"Typography::headline-lg/line-height"},"fallback":{"family":"Inter","style":"Bold","size":28,"lineHeight":36}},{"name":"headline/md","role":"headline-md","tracking":-1,"uppercase":false,"bind":{"fontFamily":"Typography::headline-md/family","fontStyle":"Typography::headline-md/style","fontSize":"Typography::headline-md/size","lineHeight":"Typography::headline-md/line-height"},"fallback":{"family":"Inter","style":"Bold","size":24,"lineHeight":32}},{"name":"headline/sm","role":"headline-sm","tracking":-0.5,"uppercase":false,"bind":{"fontFamily":"Typography::headline-sm/family","fontStyle":"Typography::headline-sm/style","fontSize":"Typography::headline-sm/size","lineHeight":"Typography::headline-sm/line-height"},"fallback":{"family":"Inter","style":"Bold","size":20,"lineHeight":28}},{"name":"title/lg","role":"title-lg","tracking":-0.5,"uppercase":false,"bind":{"fontFamily":"Typography::title-lg/family","fontStyle":"Typography::title-lg/style","fontSize":"Typography::title-lg/size","lineHeight":"Typography::title-lg/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":18,"lineHeight":24}},{"name":"title/md","role":"title-md","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::title-md/family","fontStyle":"Typography::title-md/style","fontSize":"Typography::title-md/size","lineHeight":"Typography::title-md/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":16,"lineHeight":22}},{"name":"title/sm","role":"title-sm","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::title-sm/family","fontStyle":"Typography::title-sm/style","fontSize":"Typography::title-sm/size","lineHeight":"Typography::title-sm/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":14,"lineHeight":20}},{"name":"body/lg","role":"body-lg","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::body-lg/family","fontStyle":"Typography::body-lg/style","fontSize":"Typography::body-lg/size","lineHeight":"Typography::body-lg/line-height"},"fallback":{"family":"Inter","style":"Regular","size":18,"lineHeight":28}},{"name":"body/md","role":"body-md","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::body-md/family","fontStyle":"Typography::body-md/style","fontSize":"Typography::body-md/size","lineHeight":"Typography::body-md/line-height"},"fallback":{"family":"Inter","style":"Regular","size":16,"lineHeight":24}},{"name":"body/sm","role":"body-sm","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::body-sm/family","fontStyle":"Typography::body-sm/style","fontSize":"Typography::body-sm/size","lineHeight":"Typography::body-sm/line-height"},"fallback":{"family":"Inter","style":"Regular","size":14,"lineHeight":20}},{"name":"label/lg","role":"label-lg","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::label-lg/family","fontStyle":"Typography::label-lg/style","fontSize":"Typography::label-lg/size","lineHeight":"Typography::label-lg/line-height"},"fallback":{"family":"Inter","style":"Medium","size":15,"lineHeight":20}},{"name":"label/md","role":"label-md","tracking":0.5,"uppercase":false,"bind":{"fontFamily":"Typography::label-md/family","fontStyle":"Typography::label-md/style","fontSize":"Typography::label-md/size","lineHeight":"Typography::label-md/line-height"},"fallback":{"family":"Inter","style":"Medium","size":13,"lineHeight":16}},{"name":"label/sm","role":"label-sm","tracking":0.5,"uppercase":false,"bind":{"fontFamily":"Typography::label-sm/family","fontStyle":"Typography::label-sm/style","fontSize":"Typography::label-sm/size","lineHeight":"Typography::label-sm/line-height"},"fallback":{"family":"Inter","style":"Medium","size":11,"lineHeight":14}},{"name":"caption","role":"caption","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::caption/family","fontStyle":"Typography::caption/style","fontSize":"Typography::caption/size","lineHeight":"Typography::caption/line-height"},"fallback":{"family":"Inter","style":"Regular","size":12,"lineHeight":16}},{"name":"overline","role":"overline","tracking":6,"uppercase":true,"bind":{"fontFamily":"Typography::overline/family","fontStyle":"Typography::overline/style","fontSize":"Typography::overline/size","lineHeight":"Typography::overline/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":11,"lineHeight":16}},{"name":"numeric/xl","role":"numeric-xl","tracking":-1,"uppercase":false,"bind":{"fontFamily":"Typography::numeric-xl/family","fontStyle":"Typography::numeric-xl/style","fontSize":"Typography::numeric-xl/size","lineHeight":"Typography::numeric-xl/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":40,"lineHeight":44}},{"name":"numeric/lg","role":"numeric-lg","tracking":-1,"uppercase":false,"bind":{"fontFamily":"Typography::numeric-lg/family","fontStyle":"Typography::numeric-lg/style","fontSize":"Typography::numeric-lg/size","lineHeight":"Typography::numeric-lg/line-height"},"fallback":{"family":"Inter","style":"Semi Bold","size":28,"lineHeight":32}},{"name":"numeric/md","role":"numeric-md","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::numeric-md/family","fontStyle":"Typography::numeric-md/style","fontSize":"Typography::numeric-md/size","lineHeight":"Typography::numeric-md/line-height"},"fallback":{"family":"Inter","style":"Medium","size":18,"lineHeight":24}},{"name":"code","role":"code","tracking":0,"uppercase":false,"bind":{"fontFamily":"Typography::code/family","fontStyle":"Typography::code/style","fontSize":"Typography::code/size","lineHeight":"Typography::code/line-height"},"fallback":{"family":"JetBrains Mono","style":"Regular","size":14,"lineHeight":20}}],"effectStyles":[{"name":"elevation/0","description":"À plat. Séparation par bordure.","layers":[]},{"name":"elevation/1","description":"","layers":[{"color":"Theme::effect/shadow-key","offsetX":0,"offsetY":1,"blur":2,"spread":0},{"color":"Theme::effect/shadow-ambient","offsetX":0,"offsetY":1,"blur":3,"spread":0}]},{"name":"elevation/2","description":"","layers":[{"color":"Theme::effect/shadow-key","offsetX":0,"offsetY":2,"blur":4,"spread":-1},{"color":"Theme::effect/shadow-ambient","offsetX":0,"offsetY":4,"blur":12,"spread":-2}]},{"name":"elevation/3","description":"","layers":[{"color":"Theme::effect/shadow-key","offsetX":0,"offsetY":4,"blur":8,"spread":-2},{"color":"Theme::effect/shadow-ambient","offsetX":0,"offsetY":12,"blur":24,"spread":-4}]},{"name":"elevation/4","description":"","layers":[{"color":"Theme::effect/shadow-key","offsetX":0,"offsetY":8,"blur":16,"spread":-4},{"color":"Theme::effect/shadow-ambient","offsetX":0,"offsetY":24,"blur":48,"spread":-8}]},{"name":"focus/ring","description":"","layers":[{"color":"Theme::bg/canvas","offsetX":0,"offsetY":0,"blur":0,"spread":2},{"color":"Theme::border/focus","offsetX":0,"offsetY":0,"blur":0,"spread":4}]},{"name":"blur/glass","description":"Flou d'arrière-plan des barres translucides","backgroundBlur":16}],"fonts":[{"family":"Inter","style":"Bold"},{"family":"Inter","style":"Semi Bold"},{"family":"Inter","style":"Regular"},{"family":"Inter","style":"Medium"},{"family":"JetBrains Mono","style":"Regular"},{"family":"Barlow Condensed","style":"Bold"},{"family":"Fraunces","style":"SemiBold"},{"family":"Space Grotesk","style":"Bold"}]};

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
