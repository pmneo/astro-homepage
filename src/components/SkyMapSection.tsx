"use client";

import { useEffect, useState } from "react";
import type { SchedulerJob } from "skymap-widget";
import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";
import { site } from "@/content/site";
import { useObservatoryStatus, type LiveActiveJob } from "@/lib/useObservatoryStatus";

// A short head start for the scroll-scrubbed background video's own connection before Aladin's
// (~1.8MB, plus its own tile-fetch storm once it boots) script starts competing for the same
// per-origin connection pool — see public/sw.js for the other half of this fix, which throttles
// the tile requests themselves once they do start.
const MOUNT_DELAY_MS = 500;

/** SkyMapCard needs the full private-dashboard SchedulerJob shape (see skymap-widget's own
 *  scheduler.ts) for its marker/popup, but the public push only carries the handful of fields
 *  that are actually anyone else's business (see KStarsClusterServer.pushPublicStatus) — the
 *  rest (sequence file path, fRatio, moon-separation constraint, ...) are meaningless or
 *  inappropriate to expose here, so they're filled with inert placeholders. state is hardcoded to
 *  JOB_BUSY (3) since activeJob is only ever non-null while the scheduler is actually executing it. */
function toSchedulerJob(job: LiveActiveJob): SchedulerJob {
  return {
    name: job.targetName,
    altitude: 0,
    completedCount: job.completedCount,
    completionTime: "",
    inSequenceFocus: false,
    minAltitude: 0,
    minMoonSeparation: 0,
    pa: job.pa,
    repeatsRemaining: 0,
    repeatsRequired: 0,
    sequence: "",
    sequenceCount: job.sequenceCount,
    stage: 0,
    startupTime: "",
    state: 3,
    targetDEC: job.targetDEC,
    targetRA: job.targetRA,
    fRatio: 0,
  };
}

export default function SkyMapSection() {
  const [ready, setReady] = useState(false);
  const status = useObservatoryStatus();

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), MOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const live = status?.available && !status.stale ? status : null;
  const liveJob = live?.activeJob ?? null;

  return (
    <Section id="sky-map" eyebrow="Where it's all pointed" title="Sky map">
      {ready ? (
        <PublicSkyMap
          username={site.astrobinUsername}
          activeJob={liveJob ? toSchedulerJob(liveJob) : null}
          // The job's own target coordinates double as "current mount position" here — during
          // JOB_BUSY (the only time this is set at all) the mount is tracking that exact target,
          // and the public push has no live encoder position to offer instead.
          mountCoords={liveJob ? { ra: liveJob.targetRA, dec: liveJob.targetDEC } : undefined}
          fov={live?.fov ?? undefined}
          pa={liveJob?.pa}
        />
      ) : (
        <p className="text-slate-500">Loading sky map…</p>
      )}
    </Section>
  );
}
