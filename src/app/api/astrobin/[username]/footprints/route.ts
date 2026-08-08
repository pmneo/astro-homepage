import { NextResponse } from "next/server";
import { getFootprints } from "@/lib/astrobin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  try {
    const footprints = await getFootprints(username);
    if (footprints === null) {
      return NextResponse.json({ error: "user not found" }, { status: 404 });
    }
    // Explore-use tracking used to live here, but this same route is hit twice per lookup —
    // once by ExploreSection's own AstrobinIndexGate, once more by SkyMapCard's internal data
    // fetch once it mounts — which double-counted every single explore action. Moved to a
    // dedicated POST /api/stats/explore-use that ExploreSection calls exactly once per lookup
    // (deduped client-side) instead of piggybacking on however many times this GET fires.
    return NextResponse.json(
      { footprints },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
