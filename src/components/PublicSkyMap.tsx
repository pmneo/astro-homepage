"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { SkyMapCard, type SchedulerJob } from "skymap-widget";
import { createPublicSkyMapDataSource } from "@/skymap/publicDataSource";

// SkyMapCard's own Aladin-init effect runs once on mount and bails silently (no retry) if
// `window.A` isn't defined yet — in KStarsCluster's own app that's guaranteed by a blocking
// <script> tag in index.html loaded before React boots. Here the script loads async, so this
// wrapper gates rendering SkyMapCard at all until it's confirmed ready. (window.A itself is
// already declared globally by SkyMapCard.tsx.)

// Self-hosted (see scripts/fetch-vendor.mjs) rather than loaded from aladin.cds.unistra.fr
// directly — that was noticeably slow (external DNS/TLS + their own server, no CDN edge nearby).
const ALADIN_SRC = "/vendor/aladin/aladin.js";

interface Props {
  username: string;
  /** Live observatory status (see SkyMapSection, which is the only caller that ever passes
   *  these) — undefined for the Explore section, which has no business showing the site owner's
   *  own live capture status on someone else's looked-up gallery. */
  activeJob?: SchedulerJob | null;
  mountCoords?: { ra: number; dec: number };
  fov?: { widthArcmin: number; heightArcmin: number };
  pa?: number;
}

export default function PublicSkyMap({ username, activeJob = null, mountCoords, fov, pa }: Props) {
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.A);
  const dataSource = useMemo(() => createPublicSkyMapDataSource(username), [username]);

  return (
    <div className="sky-map-public">
      <Script src={ALADIN_SRC} strategy="lazyOnload" onLoad={() => setScriptReady(true)} />
      {scriptReady ? (
        <SkyMapCard
          dataSource={dataSource}
          activeJob={activeJob}
          mountCoords={mountCoords}
          fov={fov}
          pa={pa}
          supportsOpenTargets={false}
        />
      ) : (
        // Same "sky-map" class SkyMapCard's own outer box uses (aspect-ratio: 16/9, see
        // skymap-widget's SkyMap.css) — see SkyMapSection's identical placeholder for why a bare
        // line of text here caused a layout jump big enough to throw off anchor scrolling further
        // down the page.
        <div className="sky-map flex items-center justify-center text-slate-500">Loading sky map…</div>
      )}
    </div>
  );
}
