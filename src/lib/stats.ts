import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/** Owner-only usage counters — not a full analytics system, just enough to answer "does anyone
 *  actually look at this" and "does anyone use the Explore tool". Plain read-modify-write on a
 *  single JSON file, not locked against concurrent writes racing each other — this is a low-
 *  traffic personal site, and losing an occasional increment under real concurrency is harmless,
 *  same pragmatism as the rest of this cache layer (see diskCache.ts). Lives outside CACHE_ROOT's
 *  images/hips/astrobin-meta namespaces so /api/cache/evict's "all" can never wipe it by accident —
 *  this is data the owner wants to keep, not a cache.
 *
 *  Defaults to living inside the app's own working directory, same as the rest of the cache — but
 *  unlike the cache, this is cumulative data meant to survive forever, and a Plesk-style deploy
 *  (fresh git checkout, not an in-place update) wipes anything gitignored right along with it. Set
 *  STATS_DIR to an absolute path *outside* the deployed app tree (e.g. a Plesk vhost's own
 *  persistent data directory, not its httpdocs) to actually survive redeploys — this file has no
 *  way to know where that is on any given server, only the person deploying it does. */
const STATS_DIR = process.env.STATS_DIR ? path.resolve(process.env.STATS_DIR) : path.join(process.cwd(), ".cache", "stats");
const STATS_FILE = path.join(STATS_DIR, "counters.json");

interface StatsData {
  since: number;
  pageViews: number;
  /** Distinct explore "uses" is just Object.keys(exploredUsernames).length — there's no separate
   *  running counter for it, since a per-visit tally would count repeat lookups of the same
   *  username as more "use" rather than more reach. exploredUsernames itself still counts each
   *  distinct-visit lookup per username (see recordExploreUse). */
  exploredUsernames: Record<string, number>;
  /** Epoch ms of each username's most recent lookup — keyed the same as exploredUsernames.
   *  Merged in via emptyStats's spread in readStats, so a counters.json written before this field
   *  existed just comes back with an empty object here instead of throwing. */
  lastExploredAt: Record<string, number>;
  donateClicks: number;
}

function emptyStats(): StatsData {
  return { since: Date.now(), pageViews: 0, exploredUsernames: {}, lastExploredAt: {}, donateClicks: 0 };
}

async function readStats(): Promise<StatsData> {
  try {
    const raw = JSON.parse(await readFile(STATS_FILE, "utf-8"));
    return { ...emptyStats(), ...raw };
  } catch {
    return emptyStats();
  }
}

async function writeStats(data: StatsData): Promise<void> {
  await mkdir(STATS_DIR, { recursive: true });
  await writeFile(STATS_FILE, JSON.stringify(data));
}

/** Called by PageViewBeacon, already deduped client-side (its own DEDUPE_WINDOW_MS) — a reload or
 *  repeat visit within that window doesn't call this again, so this counts distinct-ish visits
 *  rather than every render. */
export async function recordPageView(): Promise<void> {
  const stats = await readStats();
  stats.pageViews += 1;
  await writeStats(stats);
}

/** Called by POST /api/stats/explore-use, once per lookup, already deduped client-side
 *  (ExploreSection's own EXPLORE_DEDUPE_WINDOW_MS) and filtered to exclude the site owner's own
 *  username — so exploredUsernames/lastExploredAt both reflect distinct explore actions, not raw
 *  hits on the (also internally-reused) footprints route. */
export async function recordExploreUse(username: string): Promise<void> {
  const stats = await readStats();
  const key = username.toLowerCase();
  stats.exploredUsernames[key] = (stats.exploredUsernames[key] ?? 0) + 1;
  stats.lastExploredAt[key] = Date.now();
  await writeStats(stats);
}

/** Fires when the donate button is actually clicked (submitting the PayPal form) — not the same
 *  as a completed donation, just "someone was interested enough to click through". */
export async function recordDonateClick(): Promise<void> {
  const stats = await readStats();
  stats.donateClicks += 1;
  await writeStats(stats);
}

export async function getStats(): Promise<StatsData> {
  return readStats();
}
