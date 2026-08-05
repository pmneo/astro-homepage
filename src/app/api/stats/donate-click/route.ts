import { NextResponse } from "next/server";
import { recordDonateClick } from "@/lib/stats";

// Called by DonateButton's onClick — must run per-request, not get statically cached.
export const dynamic = "force-dynamic";

export async function POST() {
  await recordDonateClick();
  return new NextResponse(null, { status: 204 });
}
