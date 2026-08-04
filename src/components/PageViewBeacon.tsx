"use client";

import { useEffect } from "react";

/** Fires once per full page load to /api/stats/pageview — see src/lib/stats.ts. Client-side rather
 *  than counted during SSR since the homepage is statically prerendered (a server-side counter
 *  there would only ever increment once, at build time, not per visitor). */
export default function PageViewBeacon() {
  useEffect(() => {
    fetch("/api/stats/pageview", { method: "POST" }).catch(() => {});
  }, []);

  return null;
}
