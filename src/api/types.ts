/** Trimmed from KStarsCluster's src/api/types.ts to just the two exports SkyMapCard.tsx actually
 *  needs — the rest of that file is live-dashboard-only types (HFR/guiding samples, timeline
 *  events, captured images) with no public-site equivalent. */

export interface SchedulerJob {
  name: string;
  altitude: number;
  completedCount: number;
  completionTime: string;
  inSequenceFocus: boolean;
  minAltitude: number;
  minMoonSeparation: number;
  pa: number;
  repeatsRemaining: number;
  repeatsRequired: number;
  sequence: string;
  sequenceCount: number;
  stage: number;
  startupTime: string;
  state: number;
  targetDEC: number;
  targetRA: number;
  fRatio: number;
}

/** Mirrors org.kde.kstars.ekos.SchedulerJob.JobState's ordinal order (SchedulerJob.java). */
const JOB_STATE_LABELS = [
  'JOB_IDLE', 'JOB_EVALUATION', 'JOB_SCHEDULED', 'JOB_BUSY',
  'JOB_ERROR', 'JOB_ABORTED', 'JOB_INVALID', 'JOB_COMPLETE',
];

export function getJobStateLabel(state: number): string {
  return JOB_STATE_LABELS[state] ?? `JOB_STATE_${state}`;
}
