/**
 * Génère docs/outils-agent.md à partir du contrat `src/tools.ts` (source de vérité).
 *   pnpm doc:outils           (depuis la racine)   ·   pnpm --filter @kvalia/core doc:outils
 * Option --check : échoue si le fichier n'est pas à jour (CI).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { z } from "zod";
import { tools, toolsAvecConfirmation } from "../src/tools";

function decrire(schema: z.ZodTypeAny, profondeur = 0): string {
  const d = schema._def;
  const t = d.typeName as string;
  if (t === "ZodOptional") return `${decrire(d.innerType, profondeur)} (optionnel)`;
  if (t === "ZodNullable") return `${decrire(d.innerType, profondeur)} | null`;
  if (t === "ZodDefault") return `${decrire(d.innerType, profondeur)} — défaut \`${JSON.stringify(d.defaultValue())}\``;
  if (t === "ZodString") {
    const c = (d.checks ?? []).map((x: { kind: string }) => x.kind).filter((k: string) => k !== "min" && k !== "max");
    return c.length ? `string (${c.join(", ")})` : "string";
  }
  if (t === "ZodNumber") return (d.checks ?? []).some((x: { kind: string }) => x.kind === "int") ? "entier" : "nombre";
  if (t === "ZodBoolean") return "booléen";
  if (t === "ZodEnum") return d.values.map((v: string) => `\`${v}\``).join(" · ");
  if (t === "ZodArray") return `liste de ${decrire(d.type, profondeur)}`;
  if (t === "ZodObject") {
    if (profondeur >= 1) return "objet";
    const shape = d.shape() as Record<string, z.ZodTypeAny>;
    return "objet { " + Object.keys(shape).join(", ") + " }";
  }
  return t.replace("Zod", "").toLowerCase();
}

function champs(schema: z.ZodTypeAny): string[] {
  const d = schema._def;
  if (d.typeName !== "ZodObject") return [`- ${decrire(schema)}`];
  const shape = d.shape() as Record<string, z.ZodTypeAny>;
  return Object.entries(shape).map(([k, v]) => {
    const desc = (v as z.ZodTypeAny).description ?? ((v as z.ZodTypeAny)._def.innerType as z.ZodTypeAny | undefined)?.description;
    return `- \`${k}\` : ${decrire(v)}${desc ? ` — ${desc}` : ""}`;
  });
}

const lignes: string[] = [
  "# Outils de l'agent (contrat MCP)",
  "",
  "> Généré depuis `packages/core/src/tools.ts` par `pnpm doc:outils` — ne pas éditer à la main.",
  "> Chaque outil est exposé tel quel par `apps/agent` (serveur MCP) et appelé par l'app via `executer()` : même entrée, même sortie, même règle.",
  "",
  `${Object.keys(tools).length} outils. Ceux marqués **à confirmer** modifient beaucoup de données : l'agent demande avant.`,
  "",
];
for (const [nom, def] of Object.entries(tools)) {
  lignes.push(
    `## \`${nom}\`${toolsAvecConfirmation.has(nom) ? " — à confirmer" : ""}`,
    "",
    def.description,
    "",
    "**Entrée**",
    ...(champs(def.input).length ? champs(def.input) : ["- (aucune)"]),
    "",
    "**Sortie**",
    ...champs(def.output),
    "",
  );
}
const contenu = lignes.join("\n");
const cible = fileURLToPath(new URL("../../../docs/outils-agent.md", import.meta.url));
if (process.argv.includes("--check")) {
  const actuel = (() => {
    try {
      return readFileSync(cible, "utf8");
    } catch {
      return "";
    }
  })();
  if (actuel !== contenu) {
    console.error("docs/outils-agent.md n'est pas à jour : lance `pnpm doc:outils`.");
    process.exit(1);
  }
  console.log("docs/outils-agent.md à jour.");
} else {
  writeFileSync(cible, contenu);
  console.log(`docs/outils-agent.md écrit (${Object.keys(tools).length} outils).`);
}
