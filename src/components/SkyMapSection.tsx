"use client";

import { useEffect, useRef, useState } from "react";
import type { SchedulerJob } from "skymap-widget";
import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";
import { site } from "@/content/site";
import { useObservatoryStatus, type LiveActiveJob } from "@/lib/useObservatoryStatus";

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
  const status = useObservatoryStatus();
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // PublicSkyMap mounting is what actually kicks off the Aladin script load, HiPS tile fetches,
  // and AstroBin footprint thumbnail fetches — no point paying for any of that on every page load
  // if the visitor never scrolls this far down. rootMargin gives it a 200px head start before the
  // section is fully in view, so it's ready by the time scrolling actually reaches it instead of
  // popping in empty. Disconnects after the first trigger — once loaded, it stays loaded even if
  // scrolled back out of view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const live = status?.available && !status.stale ? status : null;
  const liveJob = live?.activeJob ?? null;

  return (
    <Section id="sky-map" eyebrow="Where it's all pointed" title="Sky map">
      <div ref={containerRef}>
        {isVisible ? (
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
      </div>
    </Section>
  );
}
