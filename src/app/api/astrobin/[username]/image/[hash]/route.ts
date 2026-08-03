import { NextResponse } from "next/server";
import { getImageDetail } from "@/lib/astrobin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string; hash: string }> },
) {
  const { hash } = await params;
  try {
    const detail = await getImageDetail(hash);
    if (detail === null) {
      return NextResponse.json({ error: "image not found" }, { status: 404 });
    }
    return NextResponse.json(detail, {
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return NextResponse.json({ error: "upstream error" }, { status: 502 });
  }
}
