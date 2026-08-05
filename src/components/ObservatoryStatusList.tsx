"use client";

import { site } from "@/content/site";
import { useObservatoryStatus } from "@/lib/useObservatoryStatus";

/** Starts with the static description (about the observatory in general) and progressively
 *  upgrades to KStarsCluster's live push once the first successful fetch resolves — see
 *  src/app/api/observatory-status/route.ts. Falls back to static again if the feed goes stale
 *  (KStarsCluster stopped pushing) rather than freezing on the last real values forever. */
export default function ObservatoryStatusList() {
  const status = useObservatoryStatus();
  const live = status?.available && !status.stale ? status : null;

  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-4 self-start text-sm">
      <dt className="text-slate-500">Location</dt>
      <dd className="text-slate-200">{site.location.place}</dd>

      <dt className="text-slate-500">Roof</dt>
      <dd className="text-slate-200">{live ? (live.roofOpen ? "Open" : "Closed") : "Roll-off, remote controlled"}</dd>

      <dt className="text-slate-500">Status</dt>
      <dd className="text-slate-200">
        {live
          ? live.activeJob
            ? `Capturing ${live.activeJob.targetName} (${live.activeJob.completedCount}/${live.activeJob.sequenceCount})`
            : live.ekosReady
              ? "Idle, ready"
              : "Parked"
          : "Polar-aligned & parked, ready to open"}
      </dd>

      {live && !live.weatherSafe && (
        <>
          <dt className="text-slate-500">Weather</dt>
          <dd className="text-rose-400">Unsafe conditions</dd>
        </>
      )}

      {live && (
        <span className="col-span-2 mt-1 flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Live
        </span>
      )}
    </dl>
  );
}
