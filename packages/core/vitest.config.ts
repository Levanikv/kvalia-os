import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // Les tests tournent dans le fuseau de l'utilisateur : « aujourd'hui » et les dates relatives sont calendaires.
    env: { TZ: "Europe/Paris", KVALIA_TZ: "Europe/Paris" },
  },
});
