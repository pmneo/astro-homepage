import { NextResponse } from "next/server";
import { readObservatoryStatus, writeObservatoryStatus, type ActiveJob, type Fov } from "@/lib/observatoryStatus";

export const dynamic = "force-dynamic";

// If KStarsCluster hasn't pushed anything in a while (crashed, network down, observatory
// machine off), the last snapshot would otherwise sit there looking "live" forever — 2.5x the
// 60s push interval gives a couple of missed pushes' worth of slack before calling it stale.
const STALE_AFTER_MS = 150_000;

function parseActiveJob(value: unknown): ActiveJob | null {
  if (!value || typeof value !== "object") return null;
  const job = value as Record<string, unknown>;
  return {
    targetName: String(job.targetName ?? ""),
    stateLabel: String(job.stateLabel ?? ""),
    completedCount: Number(job.completedCount ?? 0),
    sequenceCount: Number(job.sequenceCount ?? 0),
    targetRA: Number(job.targetRA ?? 0),
    targetDEC: Number(job.targetDEC ?? 0),
    pa: Number(job.pa ?? 0),
  };
}

function parseFov(value: unknown): Fov | null {
  if (!value || typeof value !== "object") return null;
  const fov = value as Record<string, unknown>;
  return {
    widthArcmin: Number(fov.widthArcmin ?? 0),
    heightArcmin: Number(fov.heightArcmin ?? 0),
  };
}

/** Pushed by KStarsCluster's own KStarsClusterServer.pushPublicStatus() — gated behind a
 *  dedicated secret (not CACHE_EVICT_SECRET) since this is a different trust boundary: a specific
 *  known machine writing data in, not the site owner reading via a URL param. Disabled (404)
 *  unless OBSERVATORY_STATUS_SECRET is set. */
export async function POST(req: Request) {
  const secret = process.env.OBSERVATORY_STATUS_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "not configured" }, { status: 404 });
  }
  if (req.headers.get("x-observatory-secret") !== secret) {
    return NextResponse.json({ error: "invalid secret" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || typeof body.timestamp !== "number") {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  await writeObservatoryStatus({
    timestamp: body.timestamp,
    kstarsRunning: Boolean(body.kstarsRunning),
    ekosReady: Boolean(body.ekosReady),
    roofOpen: Boolean(body.roofOpen),
    weatherSafe: Boolean(body.weatherSafe),
    activeJob: parseActiveJob(body.activeJob),
    fov: parseFov(body.fov),
  });

  return NextResponse.json({ ok: true });
}

// Public, no secret — this is what the site itself shows visitors.
export async function GET() {
  const status = await readObservatoryStatus();
  if (!status) {
    return NextResponse.json({ available: false });
  }

  return NextResponse.json({
    available: true,
    stale: Date.now() - status.timestamp > STALE_AFTER_MS,
    ...status,
  });
}
