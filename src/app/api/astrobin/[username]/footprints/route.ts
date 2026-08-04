import { NextResponse } from "next/server";
import { getFootprints } from "@/lib/astrobin";
import { recordExploreUse } from "@/lib/stats";
import { site } from "@/content/site";

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
    // This same route backs both the owner's own Sky map section and the Explore section — only
    // the latter (a visitor looking up someone other than the site owner) counts as "Explore" use.
    if (username.toLowerCase() !== site.astrobinUsername.toLowerCase()) {
      recordExploreUse(username).catch(() => {});
    }
    return NextResponse.json(
      { footprints },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
