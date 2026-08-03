"use client";

import Script from "next/script";
import { useEffect, useId, useRef, useState } from "react";
import type { AstrobinFootprint } from "@/lib/astrobin";

// Aladin Lite v3 ships no official types and attaches itself to window — same approach
// KStarsCluster's own SkyMapCard.tsx uses.
declare global {
  interface Window {
    A: {
      init: Promise<void>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      aladin: (target: string | HTMLElement, options?: Record<string, unknown>) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      graphicOverlay: (options?: Record<string, unknown>) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      polygon: (corners: [number, number][], options?: Record<string, unknown>) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      circle: (ra: number, dec: number, radiusDeg: number, options?: Record<string, unknown>) => any;
    };
  }
}

const ALADIN_SRC = "https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js";

interface Props {
  username: string;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; footprints: AstrobinFootprint[] };

function footprintRadiusDeg(f: AstrobinFootprint): number {
  const w = f.widthDeg ?? 1;
  const h = f.heightDeg ?? 1;
  return Math.max(w, h) / 2;
}

export default function AstrobinSkyMap({ username }: Props) {
  const domId = useId().replace(/[:]/g, "");
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(() => typeof window !== "undefined" && !!window.A);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/astrobin/${encodeURIComponent(username)}/footprints`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? `No AstroBin user named "${username}"` : "AstroBin is unreachable right now");
        }
        return res.json() as Promise<{ footprints: AstrobinFootprint[] }>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", footprints: data.footprints });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (!scriptReady || state.status !== "ready" || !containerRef.current) return;

    let disposed = false;
    window.A.init.then(() => {
      if (disposed || !containerRef.current) return;
      const aladin = window.A.aladin(containerRef.current, {
        survey: "P/DSS2/color",
        fov: 60,
        showFullscreenControl: false,
        showLayersControl: false,
        showGotoControl: false,
        cooFrame: "equatorial",
      });

      const overlay = window.A.graphicOverlay({ color: "#22d3ee", lineWidth: 1.5 });
      aladin.addOverlay(overlay);
      for (const footprint of state.footprints) {
        if (footprint.corners) {
          overlay.add(window.A.polygon(footprint.corners));
        } else if (footprint.ra !== undefined && footprint.dec !== undefined) {
          overlay.add(window.A.circle(footprint.ra, footprint.dec, footprintRadiusDeg(footprint)));
        }
      }
    });

    return () => {
      disposed = true;
    };
  }, [scriptReady, state]);

  return (
    <div>
      <Script src={ALADIN_SRC} strategy="lazyOnload" onLoad={() => setScriptReady(true)} />
      <div
        id={`aladin-${domId}`}
        ref={containerRef}
        className="h-[420px] w-full overflow-hidden rounded-xl border border-white/10 bg-slate-900"
      />
      {state.status === "error" && <p className="mt-3 text-rose-400">{state.message}</p>}
      {state.status === "ready" && (
        <p className="mt-3 text-sm text-slate-500">
          {state.footprints.length} plate-solved field{state.footprints.length === 1 ? "" : "s"} shown — each
          rectangle is one imaged target, sized and rotated to its real field of view.
        </p>
      )}
    </div>
  );
}
