#!/usr/bin/env node
/** Vérifie que .env contient les variables requises pour tourner en local (pas les valeurs). */
import { existsSync, readFileSync } from "node:fs";

const requis = {
  web: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"],
  agent: ["SUPABASE_SERVICE_ROLE_KEY", "KVALIA_USER_ID", "MCP_TOKEN"],
};
if (!existsSync(".env")) {
  console.error("Pas de .env — `cp .env.example .env` puis remplis les clés (voir docs/runbook.md).");
  process.exit(1);
}
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).trim()];
    }),
);
let ko = 0;
for (const [cible, vars] of Object.entries(requis))
  for (const v of vars) {
    if (!env[v]) {
      console.error(`✗ ${v} manquant (${cible})`);
      ko++;
    } else console.log(`✓ ${v}`);
  }
if (!existsSync("apps/web/.env.local")) console.warn("! apps/web/.env.local absent — `ln -s ../../.env apps/web/.env.local`");
process.exit(ko ? 1 : 0);
