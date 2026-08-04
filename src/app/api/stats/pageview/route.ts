import { NextResponse } from "next/server";
import { recordPageView } from "@/lib/stats";

// Called once per page load by PageViewBeacon — must run per-request, not get statically cached
// the way the page itself is.
export const dynamic = "force-dynamic";

export async function POST() {
  await recordPageView();
  return new NextResponse(null, { status: 204 });
}
