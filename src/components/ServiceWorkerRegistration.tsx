"use client";

import { useEffect } from "react";

/** Registers as early as possible (top of the root layout, before most page content even renders)
 *  so it has the best chance of activating before Aladin's own ~1.8MB script finishes booting and
 *  starts firing its first batch of HiPS tile requests — see public/sw.js for what it actually
 *  does once active. */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
