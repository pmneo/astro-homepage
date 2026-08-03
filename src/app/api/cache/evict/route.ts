import { NextResponse } from "next/server";
import { evictCached } from "@/lib/diskCache";
import { inferImageContentType } from "@/lib/imageCache";
import { clearMemoryCache } from "@/lib/astrobin";

type Namespace = "images" | "hips" | "astrobin" | "all";

function parseNamespace(value: string | null): Namespace {
  if (value === "hips" || value === "astrobin" || value === "all") return value;
  return "images";
}

/** Personal cache-busting for the site owner — GET (not POST) so it's a plain bookmarkable/
 *  curl-able URL, protected by a shared secret instead of a login since the worst case of someone
 *  else hitting it is just "the cache refills itself on the next request", not a security issue.
 *  Disabled entirely (404) unless CACHE_EVICT_SECRET is set — see .env.example.
 *
 *  ?namespace=images   (default) — cached AstroBin/thumbnail image bytes
 *  ?namespace=hips      — cached sho/hso HiPS tiles
 *  ?namespace=astrobin  — cached gallery/footprint/username-lookup metadata (disk + in-process)
 *  ?namespace=all       — all of the above
 *  ?url=...             — with namespace=images (default), evict just that one image instead of
 *                         the whole cache */
export async function GET(req: Request) {
  const secret = process.env.CACHE_EVICT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cache eviction not configured" }, { status: 404 });
  }

  const params = new URL(req.url).searchParams;
  if (params.get("secret") !== secret) {
    return NextResponse.json({ error: "invalid secret" }, { status: 403 });
  }

  const namespace = parseNamespace(params.get("namespace"));
  const url = params.get("url");

  if (url && namespace === "images") {
    const { extension } = inferImageContentType(new URL(url));
    await evictCached("images", url, extension);
    return NextResponse.json({ evicted: url });
  }

  if (namespace === "images" || namespace === "all") await evictCached("images");
  if (namespace === "hips" || namespace === "all") await evictCached("hips");
  if (namespace === "astrobin" || namespace === "all") {
    await evictCached("astrobin-meta");
    clearMemoryCache();
  }

  return NextResponse.json({ evicted: namespace });
}
