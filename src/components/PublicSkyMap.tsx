"use client";

import Script from "next/script";
import { useMemo, useState } from "react";
import { SkyMapCard } from "skymap-widget";
import { createPublicSkyMapDataSource } from "@/skymap/publicDataSource";

// SkyMapCard's own Aladin-init effect runs once on mount and bails silently (no retry) if
// `window.A` isn't defined yet — in KStarsCluster's own app that's guaranteed by a blocking
// <script> tag in index.html loaded before React boots. Here the script loads async, so this
// wrapper gates rendering SkyMapCard at all until it's confirmed ready. (window.A itself is
// already declared globally by SkyMapCard.tsx.)

const ALADIN_SRC = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";

interface Props {
  username: string;
}

export default function PublicSkyMap({ username }: Props) {
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.A);
  const dataSource = useMemo(() => createPublicSkyMapDataSource(username), [username]);

  return (
    <div className="sky-map-public">
      <Script src={ALADIN_SRC} strategy="lazyOnload" onLoad={() => setScriptReady(true)} />
      {scriptReady ? (
        <SkyMapCard dataSource={dataSource} activeJob={null} />
      ) : (
        <p className="text-slate-500">Loading sky map…</p>
      )}
    </div>
  );
}
