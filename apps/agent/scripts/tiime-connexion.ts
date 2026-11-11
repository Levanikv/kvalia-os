#!/usr/bin/env tsx
/**
 * Première connexion à Tiime depuis le terminal (ADR 0010), puis une synchro pour vérifier.
 * Lit TIIME_EMAIL / TIIME_PASSWORD / TIIME_SOCIETE_ID et la clé service role dans le .env racine.
 * La vérification (notification dans l'app Tiime, ou code SMS / e-mail) se fait ici, dans ton terminal ; le jeton de rafraîchissement part dans `connexions_externes`
 * (lisible par l'agent seul), et l'agent sur Railway s'en sert ensuite sans redemander de code.
 *
 * Usage : pnpm --filter @kvalia/agent tiime:connexion            (méthode proposée par Tiime, puis synchro)
 *         pnpm --filter @kvalia/agent tiime:connexion -- --sms   (forcer le code SMS ; --email, --push aussi)
 */
import { existsSync } from "node:fs";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";
import { createServiceClient, ErreurTiime, synchroniserTiime } from "@kvalia/core";
import { contexteTiime } from "../src/tiime";

const ENV_RACINE = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(ENV_RACINE)) process.loadEnvFile(ENV_RACINE);

const userId = process.env.KVALIA_USER_ID;
if (!userId) throw new Error("KVALIA_USER_ID manquant dans .env");
for (const v of ["TIIME_EMAIL", "TIIME_PASSWORD", "TIIME_SOCIETE_ID"]) if (!process.env[v]) throw new Error(`${v} manquant dans .env`);

const db = createServiceClient();
const tiime = contexteTiime(db, userId);
if (!tiime) throw new Error("TIIME_SOCIETE_ID invalide");
const methode = ["push", "sms", "email"].find((m) => process.argv.includes(`--${m}`));

const rl = createInterface({ input: stdin, output: stdout });
try {
  let defi = await tiime.auth.demarrerConnexion(methode);
  while (defi) {
    console.log(`\nTiime : ${defi.message}`);
    if (defi.attend_code) {
      const code = (await rl.question(`Code reçu (${defi.methode}) : `)).trim();
      defi = await tiime.auth.validerCode(code);
    } else {
      await rl.question("Valide la notification dans l'app Tiime sur ton iPhone, puis appuie sur Entrée… ");
      defi = await tiime.auth.validerCode();
    }
  }
  console.log("✓ Connecté à Tiime, jeton de rafraîchissement enregistré.");

  const societes = await tiime.client.societes();
  const societe = societes.find((s) => s.id === tiime.client.societeId);
  if (!societe) throw new Error(`Société ${tiime.client.societeId} absente du compte (disponibles : ${societes.map((s) => `${s.id} ${s.name}`).join(", ")})`);
  console.log(`✓ Société : ${societe.name} (${societe.id})`);

  console.log("… synchro (lecture seule)");
  const bilan = await synchroniserTiime(db, userId, tiime.client);
  console.log(JSON.stringify(bilan, null, 2));
} catch (err) {
  console.error(err instanceof ErreurTiime ? `✗ Tiime (${err.code}) : ${err.message}` : err);
  process.exitCode = 1;
} finally {
  rl.close();
}
