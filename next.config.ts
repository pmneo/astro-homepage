import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Computed at build time from the actual git checkout being built — not from a Plesk-configured
// env var — specifically so "which commit is this deploy actually running" (see Footer.tsx) can't
// go stale/unset the way NEXT_PUBLIC_PAYPAL_BUSINESS did (see README's Plesk section: that one
// depends on Plesk's env vars reaching the *build* step, not just the running server).
function getGitSha(): string {
  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
}

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_SHA: getGitSha(),
  },
  // Plesk's Node.js Toolkit runs whatever "Application Startup File" you point it at directly —
  // standalone bundles a minimal server.js + pruned node_modules for exactly that, instead of
  // needing `next start` plus the full source tree on the server.
  output: "standalone",
  // Lets the dev server serve HMR/webpack resources to other devices on the LAN (e.g. testing
  // from a phone via the "Network:" URL next dev prints) — otherwise blocked by default.
  allowedDevOrigins: ["192.168.0.193"],
  // skymap-widget ships raw TS/TSX (no build step of its own, see its README) — Next.js only
  // transpiles the app's own source by default, so anything imported from node_modules needs an
  // explicit opt-in to go through the same pipeline instead of being loaded as pre-built JS.
  transpilePackages: ["skymap-widget"],
  // No remotePatterns needed: gallery/footprint thumbnails are all rewritten to same-origin
  // /api/image-cache URLs server-side (see lib/imageCache.ts) rather than linked to
  // cdn.astrobin.com directly.
};

export default nextConfig;
