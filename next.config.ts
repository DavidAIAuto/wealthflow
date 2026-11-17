import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local-first, always-live data: every page/API reads the SQLite DB at request time,
  // so Cache Components prerendering is disabled.
  cacheComponents: false,
  serverExternalPackages: ["better-sqlite3", "yahoo-finance2"],
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
