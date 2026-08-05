/**
 * Server-side AstroBin client. AstroBin's own Angular frontend (app.astrobin.com/u/<username>)
 * calls a handful of unauthenticated, CORS-free JSON endpoints to render itself — found by
 * inspecting its network traffic. None of them send an Access-Control-Allow-Origin header, so a
 * browser can't call them directly from our own origin; this runs server-side (where CORS
 * doesn't apply) and caches results, mirroring the approach KStarsCluster's
 * AstrobinProxyServlet.java already uses for the site owner's own dashboard.
 */

import { cachedImageUrl } from "./imageCache";
import { readCachedJson, writeCachedJson } from "./diskCache";

const API_BASE = "https://app.astrobin.com/api/v2";

// Disk-backed second-level cache (see diskCache.ts) behind the in-memory Maps below — an
// in-memory Map alone resets on every restart/redeploy and isn't shared if Plesk's Node.js
// Toolkit ever runs more than one worker process for this app. Not used for "no such user"
// results: those are cheap/rare enough to just re-check live rather than worry about disk-cache
// null-vs-absent ambiguity.
const ASTROBIN_META_NAMESPACE = "astrobin-meta";

// AstroBin's CDN sits behind Cloudflare bot-protection that 403s requests with no/unusual
// User-Agent — a plain server-side fetch with an ordinary browser UA passes fine.
const USER_AGENT =
  "Mozilla/5.0 (compatible; astro-homepage/1.0) AstroHomepageBot";

const IMAGE_CONTENT_TYPE_ID = 19;
const IMAGE_REVISION_CONTENT_TYPE_ID = 20;
const SOLUTION_BATCH_SIZE = 50;

// A published gallery doesn't change minute to minute — re-fetching a few hundred images' worth
// of metadata plus plate-solve data on every page load would be slow and needlessly heavy on
// AstroBin's own (undocumented, unauthenticated) API.
const GALLERY_CACHE_TTL_MS = 5 * 60 * 1000;
const USER_ID_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface GalleryImage {
  hash: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  widthPx: number;
  heightPx: number;
  viewCount: number;
  likeCount: number;
  bookmarkCount: number;
  commentCount: number;
  /** Non-empty when other AstroBin users are credited alongside the uploader — note this list
   *  itself never includes the uploader, so "any entries at all" already means "collaboration". */
  collaboratorUsernames: string[];
  /** At most one badge really applies at a time in practice — IOTD implies it was a top pick
   *  first, and AstroBin itself only ever highlights the highest one a given image reached. */
  badge: "iotd" | "top-pick" | "top-pick-nomination" | null;
}

export interface AstrobinFootprint {
  hash: string;
  title: string;
  url: string;
  thumbnailUrl: string | null;
  corners?: [number, number][];
  ra?: number;
  dec?: number;
  widthDeg?: number;
  heightDeg?: number;
  orientationDeg?: number;
}

export interface ImageDetail {
  title: string;
  url: string;
  date: string | null;
}

interface CacheEntry<T> {
  value: T;
  at: number;
}

const userIdCache = new Map<string, CacheEntry<number | null>>();
const galleryCache = new Map<string, CacheEntry<GalleryImage[]>>();
const footprintsCache = new Map<string, CacheEntry<AstrobinFootprint[]>>();

async function fetchJson<T>(url: string): Promise<T | null> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;
  return (await res.json()) as T;
}

/** Resolves an AstroBin username to its numeric user id (needed by every other endpoint here) —
 *  cached for a day since a username<->id mapping is effectively permanent. */
export async function resolveUsername(username: string): Promise<number | null> {
  const key = username.trim().toLowerCase();
  const cached = userIdCache.get(key);
  if (cached && Date.now() - cached.at < USER_ID_CACHE_TTL_MS) return cached.value;

  const diskCached = await readCachedJson<number>(ASTROBIN_META_NAMESPACE, `userid:${key}`, USER_ID_CACHE_TTL_MS);
  if (diskCached !== null) {
    userIdCache.set(key, { value: diskCached, at: Date.now() });
    return diskCached;
  }

  const users = await fetchJson<Array<{ id: number }>>(
    `${API_BASE}/common/users/?username=${encodeURIComponent(key)}`,
  );
  const id = users && users.length > 0 ? users[0].id : null;
  userIdCache.set(key, { value: id, at: Date.now() });
  if (id !== null) await writeCachedJson(ASTROBIN_META_NAMESPACE, `userid:${key}`, id);
  return id;
}

/** The "regular" thumbnail alias preserves the image's real aspect ratio (unlike the square-cropped
 *  gallery thumbnail), which matters once we lay images out as sky-map footprints. Rewritten to go
 *  through our own /api/image-cache rather than linking straight to cdn.astrobin.com, so repeat
 *  visits don't depend on AstroBin's own CDN latency. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractThumbnailUrl(image: any): string | null {
  const thumbnails = image?.thumbnails;
  if (Array.isArray(thumbnails)) {
    const regular = thumbnails.find((t) => t?.alias === "regular");
    if (regular?.url) return cachedImageUrl(String(regular.url));
  }
  return image?.finalGalleryThumbnail ? cachedImageUrl(String(image.finalGalleryThumbnail)) : null;
}

/** AstroBin's own "collaborators" list never includes the uploader themselves — so any entries at
 *  all already means "this wasn't a solo image", regardless of who uploaded it. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractCollaboratorUsernames(image: any): string[] {
  const collaborators = image?.collaborators;
  if (!Array.isArray(collaborators)) return [];
  return collaborators
    .map((c) => (c?.displayName ? String(c.displayName) : c?.username ? String(c.username) : null))
    .filter((name): name is string => name !== null);
}

/** Only the single highest badge an image reached — AstroBin's own gallery only ever shows one,
 *  and isIotd/isTopPick/isTopPickNomination aren't mutually exclusive in the raw data (an IOTD was
 *  necessarily a top pick first, so both flags stay true afterwards). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractBadge(image: any): GalleryImage["badge"] {
  if (image?.isIotd) return "iotd";
  if (image?.isTopPick) return "top-pick";
  if (image?.isTopPickNomination) return "top-pick-nomination";
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function finalRevision(image: any): any | null {
  const revisions = image?.revisions;
  if (!Array.isArray(revisions)) return null;
  return revisions.find((r) => r?.isFinal === true) ?? null;
}

/** Images with edit history carry their own plate-solve per revision (content-type 20) rather
 *  than the base Image id (content-type 19) — using the wrong one can attach a stale, differently
 *  oriented solve from a since-replaced upload. */
// AstroBin's API sends `hash: null` for a real share of images (confirmed live: dozens per
// gallery) — String(image.hash) on those silently produces the literal string "null" instead,
// so every affected image collides onto that one identical GalleryImage/AstrobinFootprint.hash
// value (breaking the React list key in AstrobinGalleryGrid.tsx, and previously breaking
// skymap-widget's footprint image cache the same way). image.pk is a numeric primary key AstroBin
// always sends (already relied on elsewhere here, e.g. solutionKey below), so it's a safe
// fallback for uniqueness — unlike hash, it's meaningless as a /i/<hash> URL, so callers building
// links must keep using the raw image.hash, not this field.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function safeHash(image: any): string {
  return image.hash != null ? String(image.hash) : `pk-${image.pk}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function solutionKey(image: any): string {
  const revision = finalRevision(image);
  return revision
    ? `${IMAGE_REVISION_CONTENT_TYPE_ID}:${revision.pk}`
    : `${IMAGE_CONTENT_TYPE_ID}:${image.pk}`;
}

/** Pages through the same lightweight listing app.astrobin.com/u/<username> itself renders from. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAllImages(userId: number): Promise<any[]> {
  const images: unknown[] = [];
  let page = 1;
  for (;;) {
    const url = `${API_BASE}/images/image/?user=${userId}&page=${page}&gallery-serializer=1&subsection=uploaded`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageResult = await fetchJson<any>(url);
    if (!pageResult) break;
    if (Array.isArray(pageResult.results)) images.push(...pageResult.results);
    if (!pageResult.next) break;
    page++;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return images as any[];
}

/** AstroBin's plate-solving results live behind a separate endpoint keyed by Django
 *  content-type/object-id, fetched in batches (it accepts a comma-separated id list per request)
 *  rather than one round trip per image. */
async function fetchSolutions(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  images: any[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Map<string, any>> {
  const idsByContentType = new Map<number, number[]>();
  for (const image of images) {
    const revision = finalRevision(image);
    const contentType = revision ? IMAGE_REVISION_CONTENT_TYPE_ID : IMAGE_CONTENT_TYPE_ID;
    const objectId = Number(revision ? revision.pk : image.pk);
    if (!idsByContentType.has(contentType)) idsByContentType.set(contentType, []);
    idsByContentType.get(contentType)!.push(objectId);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const byKey = new Map<string, any>();
  for (const [contentType, ids] of idsByContentType) {
    for (let start = 0; start < ids.length; start += SOLUTION_BATCH_SIZE) {
      const batch = ids.slice(start, start + SOLUTION_BATCH_SIZE);
      const url = `${API_BASE}/platesolving/solutions/?content_type=${contentType}&object_ids=${batch.join(",")}`;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const solutions = await fetchJson<any[]>(url);
      if (!solutions) continue;
      for (const solution of solutions) {
        if (solution?.object_id != null) byKey.set(`${contentType}:${solution.object_id}`, solution);
      }
    }
  }
  return byKey;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function preferAdvanced(solution: any, advancedKey: string, basicKey: string): number {
  const advanced = solution?.[advancedKey];
  if (advanced !== null && advanced !== undefined && advanced !== "") return Number(advanced);
  return Number(solution?.[basicKey] ?? 0);
}

/** AstroBin's "advanced" (distortion-corrected) solve reports real RA/Dec for all four corners
 *  directly — using these outright sidesteps rotation sign/handedness conventions entirely, which
 *  turned out to be genuinely ambiguous on this gallery (see AstrobinProxyServlet.java for the
 *  full story). Returned [top-left, top-right, bottom-right, bottom-left]. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractAdvancedCorners(solution: any): [number, number][] | null {
  const keys = [
    "advanced_ra_top_left", "advanced_dec_top_left",
    "advanced_ra_top_right", "advanced_dec_top_right",
    "advanced_ra_bottom_right", "advanced_dec_bottom_right",
    "advanced_ra_bottom_left", "advanced_dec_bottom_left",
  ];
  const values: number[] = [];
  for (const key of keys) {
    const v = solution?.[key];
    if (v === null || v === undefined || v === "") return null;
    values.push(Number(v));
  }
  return [
    [values[0], values[1]],
    [values[2], values[3]],
    [values[4], values[5]],
    [values[6], values[7]],
  ];
}

/** The gallery listing for the page itself — title/hash/thumbnail, no astrometry. */
export async function getGallery(username: string): Promise<GalleryImage[] | null> {
  const key = username.trim().toLowerCase();
  const cached = galleryCache.get(key);
  if (cached && Date.now() - cached.at < GALLERY_CACHE_TTL_MS) return cached.value;

  const diskCached = await readCachedJson<GalleryImage[]>(ASTROBIN_META_NAMESPACE, `gallery:${key}`, GALLERY_CACHE_TTL_MS);
  if (diskCached !== null) {
    galleryCache.set(key, { value: diskCached, at: Date.now() });
    return diskCached;
  }

  const userId = await resolveUsername(username);
  if (userId === null) return null;

  const images = await fetchAllImages(userId);
  const gallery: GalleryImage[] = images.map((image) => {
    const revision = finalRevision(image);
    const dims = revision ?? image;
    return {
      hash: safeHash(image),
      title: image.title ? String(image.title) : "Untitled",
      url: `https://app.astrobin.com/i/${image.hash}`,
      thumbnailUrl: extractThumbnailUrl(image),
      widthPx: Number(dims?.w ?? 0),
      heightPx: Number(dims?.h ?? 0),
      viewCount: Number(image.viewCount ?? 0),
      likeCount: Number(image.likeCount ?? 0),
      bookmarkCount: Number(image.bookmarkCount ?? 0),
      commentCount: Number(image.commentCount ?? 0),
      collaboratorUsernames: extractCollaboratorUsernames(image),
      badge: extractBadge(image),
    };
  });

  galleryCache.set(key, { value: gallery, at: Date.now() });
  await writeCachedJson(ASTROBIN_META_NAMESPACE, `gallery:${key}`, gallery);
  return gallery;
}

/** Plate-solved footprints for the sky map — same image listing, joined with the solutions
 *  endpoint, corners preferred over reconstructing a rectangle from center+size+orientation. */
export async function getFootprints(username: string): Promise<AstrobinFootprint[] | null> {
  const key = username.trim().toLowerCase();
  const cached = footprintsCache.get(key);
  if (cached && Date.now() - cached.at < GALLERY_CACHE_TTL_MS) return cached.value;

  const diskCached = await readCachedJson<AstrobinFootprint[]>(ASTROBIN_META_NAMESPACE, `footprints:${key}`, GALLERY_CACHE_TTL_MS);
  if (diskCached !== null) {
    footprintsCache.set(key, { value: diskCached, at: Date.now() });
    return diskCached;
  }

  const userId = await resolveUsername(username);
  if (userId === null) return null;

  const images = await fetchAllImages(userId);
  const solutionsByKey = await fetchSolutions(images);

  const footprints: AstrobinFootprint[] = [];
  for (const image of images) {
    const solution = solutionsByKey.get(solutionKey(image));
    if (!solution) continue; // not (yet) plate-solved

    const footprint: AstrobinFootprint = {
      hash: safeHash(image),
      title: image.title ? String(image.title) : "Untitled",
      url: `https://app.astrobin.com/i/${image.hash}`,
      thumbnailUrl: extractThumbnailUrl(image),
    };

    const corners = extractAdvancedCorners(solution);
    if (corners) {
      footprint.corners = corners;
    } else {
      const revision = finalRevision(image);
      const dims = revision ?? image;
      const pixscale = preferAdvanced(solution, "advanced_pixscale", "pixscale");
      const w = Number(dims?.w ?? 0);
      const h = Number(dims?.h ?? 0);
      if (pixscale <= 0 || w <= 0 || h <= 0) continue;

      footprint.ra = preferAdvanced(solution, "advanced_ra", "ra");
      footprint.dec = preferAdvanced(solution, "advanced_dec", "dec");
      footprint.widthDeg = (w * pixscale) / 3600;
      footprint.heightDeg = (h * pixscale) / 3600;
      footprint.orientationDeg = preferAdvanced(solution, "advanced_orientation", "orientation");
    }
    footprints.push(footprint);
  }

  footprintsCache.set(key, { value: footprints, at: Date.now() });
  await writeCachedJson(ASTROBIN_META_NAMESPACE, `footprints:${key}`, footprints);
  return footprints;
}

/** Clears just this process's in-memory first-level cache — called by /api/cache/evict so an
 *  eviction takes effect immediately in whichever worker handles that request, rather than only
 *  once its own TTL happens to expire (disk eviction alone doesn't help with that, since a
 *  not-yet-expired in-memory entry is checked first). Other worker processes' in-memory caches
 *  still self-heal within GALLERY_CACHE_TTL_MS/USER_ID_CACHE_TTL_MS regardless, once disk is gone. */
export function clearMemoryCache(): void {
  userIdCache.clear();
  galleryCache.clear();
  footprintsCache.clear();
}

/** On-demand image detail (capture date) — the lightweight gallery listing has no acquisition-date
 *  field at all; only the full per-image detail carries "deepSkyAcquisitions". Reports the
 *  [min, max] session date range as a single string (a plain date if it's all one night). */
export async function getImageDetail(hash: string): Promise<ImageDetail | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const page = await fetchJson<any>(`${API_BASE}/images/image/?hash=${encodeURIComponent(hash)}`);
  if (!page || !Array.isArray(page.results) || page.results.length === 0) return null;
  const image = page.results[0];

  const acquisitions = image.deepSkyAcquisitions;
  let date: string | null = null;
  if (Array.isArray(acquisitions)) {
    let min: string | null = null;
    let max: string | null = null;
    for (const entry of acquisitions) {
      const d = entry?.date;
      if (!d) continue;
      const dateStr = String(d);
      if (min === null || dateStr < min) min = dateStr;
      if (max === null || dateStr > max) max = dateStr;
    }
    date = min === null ? null : min === max ? min : `${min} – ${max}`;
  }

  return {
    title: image.title ? String(image.title) : "Untitled",
    url: `https://app.astrobin.com/i/${hash}`,
    date,
  };
}
