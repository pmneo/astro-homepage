import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

/** Shared by the HiPS tile proxy, the AstroBin image cache, and AstroBin gallery/footprint
 *  metadata — self-hosted (Plesk's Node.js Toolkit runs this as one or more persistent processes,
 *  not serverless), so a plain disk cache directory survives both restarts/redeploys and — unlike
 *  an in-memory Map — is shared across worker processes if Passenger runs more than one. Tile/image
 *  entries are immutable forever once fetched (see each route's own comment for why); JSON entries
 *  below carry an "at" timestamp so callers can apply their own TTL on read.
 *
 *  Defaults to living inside the app's own working directory — but a Plesk-style deploy (fresh git
 *  checkout, not an in-place update) wipes anything gitignored, this directory included, on every
 *  redeploy (same issue stats.ts's own STATS_DIR solves for cumulative data). Re-fetching tiles/
 *  images from AstroBin/CDS afterward is correct behavior, just needlessly slow and hard on those
 *  upstreams right after every deploy — set CACHE_DIR to an absolute path *outside* the deployed
 *  app tree to let the cache actually survive redeploys too, same as STATS_DIR. */
const CACHE_ROOT = process.env.CACHE_DIR ? path.resolve(process.env.CACHE_DIR) : path.join(process.cwd(), ".cache");

function cacheKeyToFilename(key: string): string {
  // Keys here are full upstream URLs / tile paths, not safe to use as filenames directly
  // (slashes, query strings, arbitrary length) — hash instead of trying to sanitize.
  return createHash("sha256").update(key).digest("hex");
}

function cachePath(namespace: string, key: string, extension: string): string {
  return path.join(CACHE_ROOT, namespace, `${cacheKeyToFilename(key)}${extension}`);
}

export async function readCached(namespace: string, key: string, extension: string): Promise<Buffer | null> {
  try {
    return await readFile(cachePath(namespace, key, extension));
  } catch {
    return null;
  }
}

export async function writeCached(namespace: string, key: string, extension: string, data: Buffer): Promise<void> {
  const filePath = cachePath(namespace, key, extension);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, data);
}

/** Wipes a whole namespace (e.g. "images") or, given a key, just that one cached entry — see each
 *  namespace's own evict route for how this gets exposed (both require a shared secret, see
 *  .env.example). */
export async function evictCached(namespace: string, key?: string, extension?: string): Promise<void> {
  if (key && extension) {
    await rm(cachePath(namespace, key, extension), { force: true });
    return;
  }
  await rm(path.join(CACHE_ROOT, namespace), { recursive: true, force: true });
}

interface JsonEntry<T> {
  value: T;
  at: number;
}

/** TTL is enforced here on read, not baked into the stored file — callers can change their TTL
 *  policy without invalidating everything already on disk. Returns null both when there's no entry
 *  and when there is one but it's past maxAgeMs (caller doesn't need to tell those apart). */
export async function readCachedJson<T>(namespace: string, key: string, maxAgeMs: number): Promise<T | null> {
  const buf = await readCached(namespace, key, ".json");
  if (!buf) return null;
  try {
    const entry = JSON.parse(buf.toString("utf-8")) as JsonEntry<T>;
    if (Date.now() - entry.at > maxAgeMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export async function writeCachedJson<T>(namespace: string, key: string, value: T): Promise<void> {
  const entry: JsonEntry<T> = { value, at: Date.now() };
  await writeCached(namespace, key, ".json", Buffer.from(JSON.stringify(entry), "utf-8"));
}
