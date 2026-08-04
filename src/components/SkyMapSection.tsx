"use client";

import { useEffect, useState } from "react";
import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";
import { site } from "@/content/site";

// A short head start for the scroll-scrubbed background video's own connection before Aladin's
// (~1.8MB, plus its own tile-fetch storm once it boots) script starts competing for the same
// per-origin connection pool — see public/sw.js for the other half of this fix, which throttles
// the tile requests themselves once they do start.
const MOUNT_DELAY_MS = 500;

export default function SkyMapSection() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Section id="sky-map" eyebrow="Where it's all pointed" title="Sky map">
      {ready ? <PublicSkyMap username={site.astrobinUsername} /> : <p className="text-slate-500">Loading sky map…</p>}
    </Section>
  );
}
