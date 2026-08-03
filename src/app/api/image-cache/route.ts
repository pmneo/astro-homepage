import { NextResponse } from "next/server";
import { readCached, writeCached } from "@/lib/diskCache";
import { inferImageContentType, isAllowedImageCacheSource } from "@/lib/imageCache";

const NAMESPACE = "images";

export async function GET(req: Request) {
  const requested = new URL(req.url).searchParams.get("url");
  if (!requested) {
    return NextResponse.json({ error: "missing url" }, { status: 400 });
  }

  let upstream: URL;
  try {
    upstream = new URL(requested);
  } catch {
    return NextResponse.json({ error: "invalid url" }, { status: 400 });
  }

  // Only ever proxies AstroBin's own CDN — otherwise this would be an open image-fetching proxy
  // for anyone who finds the endpoint.
  if (!isAllowedImageCacheSource(upstream)) {
    return NextResponse.json({ error: "source not allowed" }, { status: 403 });
  }

  const { extension, contentType } = inferImageContentType(upstream);
  const cacheKey = upstream.toString();

  const cached = await readCached(NAMESPACE, cacheKey, extension);
  if (cached) {
    return new NextResponse(new Uint8Array(cached), {
      headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
    });
  }

  const res = await fetch(upstream);
  if (!res.ok) {
    return NextResponse.json({ error: "upstream fetch failed" }, { status: 502 });
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeCached(NAMESPACE, cacheKey, extension, bytes);

  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
