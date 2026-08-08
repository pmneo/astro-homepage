"use client";

import { useEffect } from "react";

const STORAGE_KEY = "pageview.lastRecordedAt";
// A reload/repeat-visit within this window doesn't count again — turns the raw "fired on every
// full page load" beacon into a rough per-browser distinct-visit count instead, without cookies or
// a real visitor id. Not true uniqueness (a different browser/device, private-browsing tab, or a
// return an hour+ later all count again) — just enough to stop e.g. a few reloads while checking
// the page from bloating the counter, matching how casual this owner-only counter has always been
// (see stats.ts's own comment).
const DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/** Fires once per full page load to /api/stats/pageview — see src/lib/stats.ts. Client-side rather
 *  than counted during SSR since the homepage is statically prerendered (a server-side counter
 *  there would only ever increment once, at build time, not per visitor). */
export default function PageViewBeacon() {
  useEffect(() => {
    let lastRecordedAt = 0;
    try {
      lastRecordedAt = Number(localStorage.getItem(STORAGE_KEY)) || 0;
    } catch {
      // Storage disabled/unavailable (private browsing, locked-down browser settings, ...) — fall
      // back to counting every load rather than silently dropping the beacon.
    }
    if (Date.now() - lastRecordedAt < DEDUPE_WINDOW_MS) return;

    fetch("/api/stats/pageview", { method: "POST" })
      .then(() => {
        try {
          localStorage.setItem(STORAGE_KEY, String(Date.now()));
        } catch {
          // See above — worst case this fires again next load instead of respecting the window.
        }
      })
      .catch(() => {});
  }, []);

  return null;
}
