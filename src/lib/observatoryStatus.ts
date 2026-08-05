import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** The latest status snapshot pushed by KStarsCluster (see its own KStarsClusterServer.
 *  pushPublicStatus()) — this machine isn't publicly reachable, so it pushes to us on a timer
 *  instead of us polling it. Just the latest snapshot, not a history: this is "what's happening
 *  right now", not a log. */

const STATUS_DIR = path.join(process.cwd(), ".cache", "observatory-status");
const STATUS_FILE = path.join(STATUS_DIR, "latest.json");

export interface ActiveJob {
  targetName: string;
  stateLabel: string;
  completedCount: number;
  sequenceCount: number;
  /** J2000 target coordinates + position angle — enough to draw the same marker/FOV rectangle
   *  the private dashboard shows, using the job's target as a stand-in for live mount position
   *  (accurate while the job is actually executing, which is the only time this is non-null). */
  targetRA: number;
  targetDEC: number;
  pa: number;
}

export interface Fov {
  widthArcmin: number;
  heightArcmin: number;
}

export interface ObservatoryStatus {
  timestamp: number;
  kstarsRunning: boolean;
  ekosReady: boolean;
  roofOpen: boolean;
  weatherSafe: boolean;
  activeJob: ActiveJob | null;
  fov: Fov | null;
}

export async function writeObservatoryStatus(status: ObservatoryStatus): Promise<void> {
  await mkdir(STATUS_DIR, { recursive: true });
  await writeFile(STATUS_FILE, JSON.stringify(status));
}

export async function readObservatoryStatus(): Promise<ObservatoryStatus | null> {
  try {
    return JSON.parse(await readFile(STATUS_FILE, "utf-8")) as ObservatoryStatus;
  } catch {
    return null;
  }
}
