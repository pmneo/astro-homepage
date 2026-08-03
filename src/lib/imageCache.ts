const CDN_HOSTNAME = "cdn.astrobin.com";

/** Rewrites an AstroBin CDN URL to go through /api/image-cache instead of hotlinking it directly —
 *  every gallery thumbnail and sky-map footprint image is served from our own disk cache after the
 *  first fetch (see route.ts), instead of every visitor's browser depending on AstroBin's own CDN
 *  latency on every load. AstroBin's thumbnail URLs already carry a `?v=<hash>` cache-buster in
 *  their filename/query, so the same URL is safe to treat as permanently immutable. */
export function cachedImageUrl(originalUrl: string): string {
  return `/api/image-cache?url=${encodeURIComponent(originalUrl)}`;
}

export function isAllowedImageCacheSource(url: URL): boolean {
  return url.hostname === CDN_HOSTNAME;
}

/** AstroBin thumbnails are consistently JPEG; a couple of accessory assets (e.g. the observatory
 *  sketch) are PNG. Inferred from the URL rather than sniffed from response bytes, since we need it
 *  before caching to pick both a file extension and a Content-Type header. */
export function inferImageContentType(url: URL): { extension: string; contentType: string } {
  const path = url.pathname.toLowerCase();
  if (path.endsWith(".png")) return { extension: ".png", contentType: "image/png" };
  if (path.endsWith(".webp")) return { extension: ".webp", contentType: "image/webp" };
  return { extension: ".jpg", contentType: "image/jpeg" };
}
