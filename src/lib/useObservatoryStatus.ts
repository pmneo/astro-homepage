"use client";

import { useEffect, useState } from "react";

export interface LiveActiveJob {
  targetName: string;
  stateLabel: string;
  completedCount: number;
  sequenceCount: number;
  targetRA: number;
  targetDEC: number;
  pa: number;
}

export interface LiveFov {
  widthArcmin: number;
  heightArcmin: number;
}

export interface ObservatoryStatusResponse {
  available: boolean;
  stale?: boolean;
  kstarsRunning?: boolean;
  ekosReady?: boolean;
  roofOpen?: boolean;
  weatherSafe?: boolean;
  activeJob?: LiveActiveJob | null;
  fov?: LiveFov | null;
}

const POLL_MS = 30_000;

/** Shared by ObservatoryStatusList (the "Roof/Status/Weather" text) and SkyMapSection (the live
 *  target marker/FOV rectangle) — both need the exact same polled data, so this is the one place
 *  that actually calls /api/observatory-status. */
export function useObservatoryStatus(): ObservatoryStatusResponse | null {
  const [status, setStatus] = useState<ObservatoryStatusResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    function poll() {
      fetch("/api/observatory-status")
        .then((res) => res.json())
        .then((data: ObservatoryStatusResponse) => {
          if (!cancelled) setStatus(data);
        })
        .catch(() => {});
    }

    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return status;
}
