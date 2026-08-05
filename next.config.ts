import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Temporary diagnostic aid: GIT_REPO-based SHA resolution has silently failed once already in
// Plesk with no visible error, so this writes what actually happened to a file next to
// next.config.ts (Plesk's build step doesn't otherwise surface next.config.ts's own console
// output anywhere the site owner can see it). Remove once the deploy actually shows a real SHA.
function debugLog(message: string): void {
  try {
    appendFileSync(path.join(process.cwd(), "next-config-debug.log"), `${new Date().toISOString()} ${message}\n`);
  } catch {
    // best-effort only — must never break the build
  }
}

// Computed at build time so "which commit is this deploy actually running" (see Footer.tsx) can't
// go stale/unset the way NEXT_PUBLIC_PAYPAL_BUSINESS did (see README's Plesk section: that one
// depends on Plesk's env vars reaching the *build* step, not just the running server).
//
// GIT_REPO (if set) points at Plesk's own bare repo clone and wins over a local git lookup:
// Plesk's Git extension deploys this app's files without leaving a working `.git` directory
// behind wherever `npm run build` actually runs, so a plain `git rev-parse` always fails there.
// Deploy-script approaches (passing GIT_SHA inline, writing a GIT_SHA.txt file) both turned out to
// be unreliable in practice — Plesk's deploy action doesn't cleanly hand values from one script
// line to the next. GIT_REPO instead is a single, persistent variable set once in the Node.js
// Toolkit's own environment-variables panel (like CACHE_EVICT_SECRET), which does reliably reach
// the build step. This is also deliberately not "ask GitHub for the latest commit on main": that
// would only be a guess at what's live, wrong the moment a deploy lags behind a push or a
// non-main ref is what's actually checked out — reading the SHA straight from the repo Plesk
// itself deployed from is exact by construction.
function getGitSha(): string {
  debugLog(`cwd=${process.cwd()}`);
  const gitLikeKeys = Object.keys(process.env).filter((k) => /git|repo/i.test(k));
  debugLog(`env keys matching /git|repo/i: ${gitLikeKeys.length ? gitLikeKeys.join(", ") : "(none)"}`);

  const repo = process.env.GIT_REPO;
  debugLog(`GIT_REPO=${repo ?? "(unset)"}`);
  if (repo) {
    try {
      const sha = execFileSync("git", ["-C", repo, "rev-parse", "--short", "HEAD"]).toString().trim();
      debugLog(`git -C ${repo} rev-parse --short HEAD -> "${sha}"`);
      return sha;
    } catch (err) {
      debugLog(`git -C ${repo} rev-parse --short HEAD FAILED: ${(err as Error).message}`);
      return "unknown";
    }
  }
  try {
    const sha = execFileSync("git", ["rev-parse", "--short", "HEAD"]).toString().trim();
    debugLog(`local git rev-parse --short HEAD -> "${sha}"`);
    return sha;
  } catch (err) {
    debugLog(`local git rev-parse --short HEAD FAILED: ${(err as Error).message}`);
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
