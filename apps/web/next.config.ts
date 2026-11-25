import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v0 : tout est dynamique (session par cookies) ; on activera cacheComponents quand on mettra du Suspense partout.
  cacheComponents: false,
  // Les paquets du mono-repo sont du TypeScript source : Next les transpile.
  transpilePackages: ["@kvalia/core", "@kvalia/ui", "@kvalia/vision"],
  experimental: {
    // Photo d'un repas (réduite à 1 280 px côté téléphone) envoyée à la server action d'analyse.
    serverActions: { bodySizeLimit: "4mb" },
    // Cache client des pages déjà visitées : retour arrière et onglets déjà ouverts instantanés pendant 30 s.
    // Les server actions (revalidatePath) et RealtimeRefresh invalident ce cache quand les données changent.
    staleTimes: { dynamic: 30, static: 300 },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
