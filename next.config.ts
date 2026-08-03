import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plesk's Node.js Toolkit runs whatever "Application Startup File" you point it at directly —
  // standalone bundles a minimal server.js + pruned node_modules for exactly that, instead of
  // needing `next start` plus the full source tree on the server.
  output: "standalone",
  // skymap-widget ships raw TS/TSX (no build step of its own, see its README) — Next.js only
  // transpiles the app's own source by default, so anything imported from node_modules needs an
  // explicit opt-in to go through the same pipeline instead of being loaded as pre-built JS.
  transpilePackages: ["skymap-widget"],
  // skymap-widget is a sibling directory (file: dependency, symlinked into node_modules), not
  // inside this project — without this, Turbopack's module resolution treats it as out of scope
  // and reports it as unresolvable rather than following the symlink.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.astrobin.com" },
    ],
  },
};

export default nextConfig;
