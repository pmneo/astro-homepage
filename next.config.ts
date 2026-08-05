import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Computed at build time so "which commit is this deploy actually running" (see Footer.tsx) can't
// go stale/unset the way NEXT_PUBLIC_PAYPAL_BUSINESS did (see README's Plesk section: that one
// depends on Plesk's env vars reaching the *build* step, not just the running server).
//
// GIT_SHA (if set) wins over a local git lookup: Plesk's Git extension deploys this app's files
// without leaving a working `.git` directory behind wherever `npm run build` actually runs, so
// `git rev-parse` always fails there — the deploy script instead passes GIT_SHA explicitly, read
// from wherever the Git extension's *own* repository clone lives (see README's Plesk section).
// That's deliberately not "ask GitHub for the latest commit on main": that would only be a guess
// at what's live, wrong the moment a deploy lags behind a push or a non-main ref is what's
// actually checked out — reading the SHA the deploy step itself just used is exact by construction.
function getGitSha(): string {
  if (process.env.GIT_SHA) return process.env.GIT_SHA;
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
