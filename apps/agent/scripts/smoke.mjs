#!/usr/bin/env node
/**
 * Test de fumée des outils MCP : appelle chaque outil sur le serveur local et affiche la réponse.
 * Usage : pnpm --filter @kvalia/agent smoke   (serveur lancé à côté avec `pnpm --filter @kvalia/agent dev`)
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
const ENV_RACINE = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(ENV_RACINE)) process.loadEnvFile(ENV_RACINE);
const token = process.env.MCP_TOKEN?.trim();
const URL_MCP = process.env.MCP_URL ?? `http://localhost:${process.env.PORT ?? 8787}/mcp${token ? `/${token}` : ""}`;
console.log(`→ ${URL_MCP.replace(/\/mcp\/.+$/, "/mcp/<token>")}`);

const appels = [
  ["liste_actuelle", {}],
  ["ajouter_tache", { titre: "Appeler le garage", due: "demain", priorite: "haute" }],
  ["agenda_du_jour", {}],
  ["brief", {}],
  // Lecture en base seulement : ne contacte pas Tiime (pas de SMS, pas de synchro).
  ["pilotage_sasu", {}],
];

async function appeler(nom, args, id) {
  const res = await fetch(URL_MCP, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id, method: "tools/call", params: { name: nom, arguments: args } }),
  });
  const texte = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${texte.slice(0, 300)}`);
  // Réponse JSON directe ou flux SSE (lignes `data: {...}`)
  const data = texte.trimStart().startsWith("{")
    ? JSON.parse(texte)
    : JSON.parse(
        texte
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .pop()
          .slice(5),
      );
  if (data.error) throw new Error(`JSON-RPC ${data.error.code} — ${data.error.message}`);
  const contenu = data.result?.content?.[0]?.text ?? "";
  return { erreur: data.result?.isError === true, contenu };
}

let echecs = 0;
for (const [i, [nom, args]] of appels.entries()) {
  const t0 = Date.now();
  try {
    const { erreur, contenu } = await appeler(nom, args, i + 1);
    const ms = Date.now() - t0;
    if (erreur) {
      echecs++;
      console.log(`✗ ${nom} (${ms} ms)\n   ${contenu}`);
    } else {
      let apercu = contenu;
      try {
        apercu = JSON.stringify(JSON.parse(contenu), null, 1).replace(/\n\s*/g, " ");
      } catch {}
      console.log(`✓ ${nom} (${ms} ms)\n   ${apercu.slice(0, 400)}${apercu.length > 400 ? " …" : ""}`);
    }
  } catch (err) {
    echecs++;
    console.log(`✗ ${nom} — ${err.message}`);
  }
}
console.log(echecs ? `\n${echecs} outil(s) en échec` : "\nTous les outils répondent.");
process.exit(echecs ? 1 : 0);
