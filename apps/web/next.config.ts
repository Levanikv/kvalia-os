import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // v0 : tout est dynamique (session par cookies) ; on activera cacheComponents quand on mettra du Suspense partout.
  cacheComponents: false,
  // Les paquets du mono-repo sont du TypeScript source : Next les transpile.
  transpilePackages: ["@kvalia/core", "@kvalia/ui"],
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
