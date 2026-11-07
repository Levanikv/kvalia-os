/**
 * Serveur MCP « KVALIA OS » — v0 (phase 0).
 *
 * Expose les 5 outils du contrat (packages/core/src/tools.ts) en HTTP (Streamable HTTP) pour claude.ai, Claude Code
 * et plus tard l'orchestrateur. Chaque appel est journalisé dans `appels_outils`.
 *
 * TODO phase 0 : OAuth (compte unique), hébergement Railway, puis brancher en connecteur custom dans claude.ai.
 */
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServiceClient, tools, type ToolName } from "@kvalia/core";
import { executer } from "./tools.js";

const PORT = Number(process.env.PORT ?? 8787);

/** v0 : un seul utilisateur, identifié par KVALIA_USER_ID. Remplacé par OAuth en fin de phase 0. */
const USER_ID: string = process.env.KVALIA_USER_ID ?? (() => {
  throw new Error("KVALIA_USER_ID manquant (uuid de ton utilisateur Supabase)");
})();

function creerServeurMcp() {
  const mcp = new McpServer({ name: "kvalia-os", version: "0.0.1" });
  const db = createServiceClient();

  for (const nom of Object.keys(tools) as ToolName[]) {
    const def = tools[nom];
    mcp.registerTool(
      nom,
      { description: def.description, inputSchema: def.input.shape },
      async (args: unknown) => {
        const debut = Date.now();
        try {
          const entree = def.input.parse(args ?? {});
          const sortie = await executer(nom, entree as never, { db, userId: USER_ID });
          await db.from("appels_outils").insert({
            user_id: USER_ID, outil: nom, canal: "claude", entree: entree as never, sortie: sortie as never,
            succes: true, duree_ms: Date.now() - debut,
          });
          return { content: [{ type: "text" as const, text: JSON.stringify(sortie) }] };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          await db.from("appels_outils").insert({
            user_id: USER_ID, outil: nom, canal: "claude", entree: args as never, sortie: { erreur: message },
            succes: false, duree_ms: Date.now() - debut,
          });
          return { content: [{ type: "text" as const, text: `Erreur ${nom} : ${message}` }], isError: true };
        }
      },
    );
  }
  return mcp;
}

const app = new Hono();
app.get("/health", (c) => c.json({ ok: true, outils: Object.keys(tools) }));

// Un transport par requête (stateless) : simple et suffisant pour un usage perso.
app.all("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const mcp = creerServeurMcp();
  await mcp.connect(transport);
  return transport.handleRequest(c.req.raw);
});

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`KVALIA OS agent — MCP sur http://localhost:${PORT}/mcp`);
});
