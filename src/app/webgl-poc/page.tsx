"use client";

import Script from "next/script";
import { useState } from "react";
import { SkyMapCard3D } from "skymap-widget";
import { createPublicSkyMapDataSource } from "@/skymap/publicDataSource";

const ALADIN_SRC = "/vendor/aladin/aladin.js";

/** Temporary test page for the WebGL footprint-rendering PoC (see skymap-widget's
 *  SkyMapCard3D.tsx) — not linked from anywhere in the site's nav, delete once the PoC question
 *  is answered either way. */
export default function WebglPocPage() {
  const [username, setUsername] = useState("pmneo");
  const [target, setTarget] = useState("1.312 72.773");
  const [fov, setFov] = useState(1.2);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.A);

  return (
    <div style={{ padding: 24, color: "white", background: "#111", minHeight: "100vh" }}>
      <Script src={ALADIN_SRC} strategy="lazyOnload" onLoad={() => setScriptReady(true)} />
      <h1>WebGL footprint PoC</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="target (ra dec)" style={{ width: 260 }} />
        <input
          type="number"
          value={fov}
          onChange={(e) => setFov(Number(e.target.value))}
          placeholder="fov deg"
          style={{ width: 80 }}
        />
      </div>
      {scriptReady ? (
        <SkyMapCard3D
          key={`${username}-${target}-${fov}`}
          dataSource={createPublicSkyMapDataSource(username)}
          initialTarget={target}
          initialFovDeg={fov}
        />
      ) : (
        <p>Loading Aladin…</p>
      )}
    </div>
  );
}
