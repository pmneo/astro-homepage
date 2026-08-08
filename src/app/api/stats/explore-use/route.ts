import { NextResponse } from "next/server";
import { recordExploreUse } from "@/lib/stats";
import { site } from "@/content/site";

// Called by ExploreSection once per successful lookup (deduped client-side, see its own
// EXPLORE_DEDUPE_WINDOW_MS) — not by the /footprints route itself, since that route is also hit a
// second time per lookup by SkyMapCard's own internal data fetch, which used to double-count every
// single explore action. Must run per-request, not get statically cached.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  // Mirrors the old guard in the footprints route: a shared link back to the owner's own gallery
  // (?astrobin=<owner>) shouldn't inflate "someone else looked this up" counters.
  if (username && username.toLowerCase() !== site.astrobinUsername.toLowerCase()) {
    await recordExploreUse(username);
  }
  return new NextResponse(null, { status: 204 });
}
