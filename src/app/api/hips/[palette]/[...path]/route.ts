import { NextResponse } from "next/server";
import { getHipsMoc, getHipsProperties, getHipsTile, isValidHipsTilePath, SUPPORTED_HIPS_PALETTES } from "@/lib/hips";

// This route has its own disk-cache logic (see lib/hips.ts) — force-dynamic makes sure Next's own
// Full Route Cache never sits in front of that and serves a memoized response from before a
// deploy that changed how a tile gets built (e.g. the NODATA_RGB fix), independent of the
// Cache-Control header below (which only governs the *browser's* cache, not Next's own).
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ palette: string; path: string[] }> },
) {
  const { palette, path } = await params;
  if (!SUPPORTED_HIPS_PALETTES.includes(palette)) {
    return NextResponse.json({ error: "unknown palette" }, { status: 404 });
  }

  const joined = path.join("/");

  if (joined === "properties") {
    const origin = new URL(req.url).origin;
    const properties = getHipsProperties(palette, origin);
    if (!properties) return NextResponse.json({ error: "unknown palette" }, { status: 404 });
    return new NextResponse(properties, {
      headers: { "Content-Type": "text/plain;charset=utf-8", "Cache-Control": "public, max-age=3600" },
    });
  }

  if (joined === "Moc.fits") {
    try {
      const moc = await getHipsMoc(palette);
      if (!moc) return NextResponse.json({ error: "moc not found" }, { status: 404 });
      return new NextResponse(new Uint8Array(moc), {
        headers: { "Content-Type": "image/fits", "Cache-Control": "public, max-age=31536000, immutable" },
      });
    } catch {
      return NextResponse.json({ error: "upstream error" }, { status: 502 });
    }
  }

  if (!isValidHipsTilePath(joined)) {
    return NextResponse.json({ error: "invalid tile path" }, { status: 400 });
  }

  try {
    const tile = await getHipsTile(palette, joined);
    if (!tile) {
      return NextResponse.json({ error: "tile not found" }, { status: 404 });
    }
    return new NextResponse(new Uint8Array(tile), {
      headers: {
        "Content-Type": "image/png",
        // Tiles are content-addressed by (palette, tilePath) and never change once published —
        // same reasoning as KStarsCluster's own HipsProxyServlet.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
