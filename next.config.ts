import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Plesk's Node.js Toolkit runs whatever "Application Startup File" you point it at directly —
  // standalone bundles a minimal server.js + pruned node_modules for exactly that, instead of
  // needing `next start` plus the full source tree on the server.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.astrobin.com" },
    ],
  },
};

export default nextConfig;
