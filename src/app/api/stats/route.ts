import { NextResponse } from "next/server";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Read-only usage counters for the site owner — gated behind the same shared secret as
 *  /api/cache/evict (see .env.example's CACHE_EVICT_SECRET) rather than a separate one, since both
 *  are "just for me" endpoints with the same threat model. Disabled entirely (404) unless that
 *  secret is set.
 *
 *  ?secret=... (required) */
export async function GET(req: Request) {
  const secret = process.env.CACHE_EVICT_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "stats not configured" }, { status: 404 });
  }

  const params = new URL(req.url).searchParams;
  if (params.get("secret") !== secret) {
    return NextResponse.json({ error: "invalid secret" }, { status: 403 });
  }

  return NextResponse.json(await getStats());
}
