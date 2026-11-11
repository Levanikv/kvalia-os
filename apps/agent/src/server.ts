/**
 * Serveur MCP « KVALIA OS » — v0 (phase 0).
 *
 * Expose les outils du contrat (packages/core/src/tools.ts) en HTTP (Streamable HTTP) pour claude.ai, Claude Code
 * et plus tard l'orchestrateur. Chaque appel est journalisé dans `appels_outils`.
 *
 * TODO phase 0 : OAuth (compte unique), hébergement Railway, puis brancher en connecteur custom dans claude.ai.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServiceClient, executer, tools, toolsAvecConfirmation, type ToolName } from "@kvalia/core";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { contexteTiime } from "./tiime";

// Charge le .env à la racine du mono-repo (apps/agent/src → ../../../.env). En prod les variables viennent de l'hébergeur.
const ENV_RACINE = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(ENV_RACINE)) process.loadEnvFile(ENV_RACINE);

const PORT = Number(process.env.PORT ?? 8787);

/**
 * v0 sans OAuth : le serveur n'est joignable que sur /mcp/<MCP_TOKEN>. claude.ai ne permet pas d'ajouter d'en-tête
 * custom, d'où le secret dans l'URL. Si MCP_TOKEN est vide (dev local), /mcp reste ouvert.
 */
const MCP_TOKEN = process.env.MCP_TOKEN?.trim() || null;

/** v0 : un seul utilisateur, identifié par KVALIA_USER_ID. Remplacé par OAuth en fin de phase 0. */
const USER_ID: string =
  process.env.KVALIA_USER_ID ??
  (() => {
    throw new Error("KVALIA_USER_ID manquant (uuid de ton utilisateur Supabase)");
  })();

/** Supabase renvoie des PostgrestError (objets simples) : on extrait un message lisible. */
function messageErreur(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) {
    const e = err as { message: string; code?: string; details?: string; hint?: string };
    return [e.code, e.message, e.details, e.hint].filter(Boolean).join(" — ");
  }
  return String(err);
}

/** Entrées à ne pas journaliser telles quelles dans `appels_outils` (codes de vérification). */
const CHAMPS_MASQUES: Partial<Record<ToolName, string[]>> = { valider_code_tiime: ["code"] };

function masquer(nom: ToolName, entree: unknown): unknown {
  const champs = CHAMPS_MASQUES[nom];
  if (!champs || !entree || typeof entree !== "object") return entree;
  return Object.fromEntries(Object.entries(entree).map(([k, v]) => [k, champs.includes(k) ? "***" : v]));
}

function creerServeurMcp() {
  const mcp = new McpServer({ name: "kvalia-os", version: "0.0.1" });
  const db = createServiceClient();
  const tiime = contexteTiime(db, USER_ID) ?? undefined;

  for (const nom of Object.keys(tools) as ToolName[]) {
    const def = tools[nom];
    mcp.registerTool(
      nom,
      {
        description: def.description,
        inputSchema: def.input.shape,
        annotations: toolsAvecConfirmation.has(nom) ? { destructiveHint: true, title: `${nom} (à confirmer)` } : { destructiveHint: false },
      },
      async (args: unknown) => {
        const debut = Date.now();
        try {
          const entree = def.input.parse(args ?? {});
          const sortie = await executer(nom, entree as never, { db, userId: USER_ID, tiime });
          await db.from("appels_outils").insert({
            user_id: USER_ID,
            outil: nom,
            canal: "claude",
            entree: masquer(nom, entree) as never,
            sortie: sortie as never,
            succes: true,
            duree_ms: Date.now() - debut,
          });
          return { content: [{ type: "text" as const, text: JSON.stringify(sortie) }] };
        } catch (err) {
          const message = messageErreur(err);
          await db.from("appels_outils").insert({
            user_id: USER_ID,
            outil: nom,
            canal: "claude",
            entree: masquer(nom, args) as never,
            sortie: { erreur: message },
            succes: false,
            duree_ms: Date.now() - debut,
          });
          return { content: [{ type: "text" as const, text: `Erreur ${nom} : ${message}` }], isError: true };
        }
      },
    );
  }
  return mcp;
}

const app = new Hono();
app.onError((err, c) => {
  console.error("[kvalia] erreur serveur :", err);
  return c.json({ erreur: messageErreur(err), stack: err.stack?.split("\n").slice(0, 4) }, 500);
});
app.get("/health", (c) => c.json({ ok: true, node: process.version, outils: Object.keys(tools) }));

// Un transport par requête (stateless) : simple et suffisant pour un usage perso.
async function traiterMcp(c: { req: { raw: Request } }) {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcp = creerServeurMcp();
  await mcp.connect(transport);
  return transport.handleRequest(c.req.raw);
}

if (MCP_TOKEN) {
  app.all("/mcp/:token", (c) => (c.req.param("token") === MCP_TOKEN ? traiterMcp(c) : c.text("Not found", 404)));
  app.all("/mcp", (c) => c.text("Not found", 404));
} else {
  console.warn("[kvalia] MCP_TOKEN absent : /mcp est ouvert sans authentification (ok en local seulement)");
  app.all("/mcp", (c) => traiterMcp(c));
}

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`KVALIA OS agent — MCP sur http://localhost:${PORT}/mcp`);
});
