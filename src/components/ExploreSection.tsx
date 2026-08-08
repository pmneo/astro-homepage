"use client";

import { useEffect, useRef, useState } from "react";
import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";
import DonateButton from "./DonateButton";

type IndexState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

const SHARE_QUERY_PARAM = "astrobin";

const EXPLORE_DEDUPE_STORAGE_KEY = "explore.lastRecordedAt";
// Same reasoning/window as PageViewBeacon's own dedupe — re-submitting the same username, or
// reloading on a shared link, within this window doesn't count again. Per-username (not a single
// timestamp) since one browser session can legitimately explore several different galleries.
const EXPLORE_DEDUPE_WINDOW_MS = 60 * 60 * 1000;

/** True (and records the attempt) the first time this browser looks up `username` in the current
 *  dedupe window; false every time after, until the window elapses. */
function shouldRecordExploreUse(username: string): boolean {
  const key = username.trim().toLowerCase();
  let recordedAt: Record<string, number> = {};
  try {
    recordedAt = JSON.parse(localStorage.getItem(EXPLORE_DEDUPE_STORAGE_KEY) ?? "{}");
  } catch {
    // Storage disabled/unavailable — fall through and record every lookup instead of none.
  }
  if (Date.now() - (recordedAt[key] ?? 0) < EXPLORE_DEDUPE_WINDOW_MS) return false;
  recordedAt[key] = Date.now();
  try {
    localStorage.setItem(EXPLORE_DEDUPE_STORAGE_KEY, JSON.stringify(recordedAt));
  } catch {
    // Worst case this fires again next lookup instead of respecting the window.
  }
  return true;
}

function shareUrlFor(username: string): string {
  const url = new URL(window.location.href);
  url.search = `?${SHARE_QUERY_PARAM}=${encodeURIComponent(username)}`;
  url.hash = "explore";
  return url.toString();
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.5 15.4 6.5M8.6 13.5 15.4 17.5" />
    </svg>
  );
}

/** Icon button next to "Show" rather than its own labeled button — links back to this same
 *  lookup (?astrobin=<username>#explore) rather than just the current page URL, so whoever opens
 *  it lands straight on *this* user's sky map without typing the username in themselves. Clicking
 *  it both attempts an automatic clipboard copy *and* opens a popover with the link as plain,
 *  selectable text — clipboard-write can silently fail (permissions, non-secure context, browser
 *  quirks) and this way there's always a manual fallback rather than a button that just quietly
 *  did nothing. */
function ShareButton({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.select();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onOutsideClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        title="Share this sky map"
        aria-label="Share this sky map"
        className="rounded-lg border border-white/10 p-2.5 text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
        onClick={() => {
          setOpen((v) => !v);
          navigator.clipboard?.writeText(shareUrlFor(username))
            .then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            })
            .catch(() => {});
        }}
      >
        <ShareIcon />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-2 w-72 rounded-lg border border-white/10 bg-slate-900 p-2 shadow-lg">
          <input
            ref={inputRef}
            type="text"
            readOnly
            value={shareUrlFor(username)}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded border border-white/10 bg-slate-950 px-2 py-1 text-xs text-slate-300 focus:border-cyan-400 focus:outline-none"
          />
          <p className="mt-1 text-xs text-slate-500">{copied ? "Copied to clipboard!" : "Select and copy manually if needed"}</p>
        </div>
      )}
    </div>
  );
}

// Wrapped in the same "sky-map" box (aspect-ratio: 16/9, see skymap-widget's SkyMap.css)
// PublicSkyMap itself renders into — this state is replaced by PublicSkyMap the moment the
// index fetch resolves, so without reserving the same footprint up front, that swap jumps this
// whole section from a few pixels tall to the map's full height all at once (see SkyMapSection's
// identical placeholder for the fuller story on why that shift matters).
function LoadingBar() {
  return (
    <div className="sky-map flex items-center justify-center">
      <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full w-1/3 rounded-full bg-cyan-400"
          style={{ animation: "loading-bar-slide 1.1s ease-in-out infinite" }}
        />
      </div>
    </div>
  );
}

/** One mount per lookup (see key={username} at the call site — that's what gives each new
 *  username a clean "loading" state instead of a stale result flashing first) — confirms the
 *  AstroBin index is actually fetched (username resolves, footprints available) before mounting
 *  PublicSkyMap at all. SkyMapCard's own internal fetch would otherwise render the full
 *  (currently-empty) sky map UI immediately and only fill in footprints once they arrive, which
 *  reads as "it's broken" for a moment rather than "it's loading". The same /footprints route
 *  PublicSkyMap's data source calls internally is cheap to call again here — server-side caching
 *  (see lib/astrobin.ts) means this doesn't hit AstroBin twice. */
function AstrobinIndexGate({ username }: { username: string }) {
  const [state, setState] = useState<IndexState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/astrobin/${encodeURIComponent(username)}/footprints`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? `No AstroBin user named "${username}"` : "AstroBin is unreachable right now");
        }
        if (!cancelled) {
          setState({ status: "ready" });
          if (shouldRecordExploreUse(username)) {
            fetch("/api/stats/explore-use", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username }),
            }).catch(() => {});
          }
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.status === "loading") return <LoadingBar />;
  if (state.status === "error") return <p className="text-rose-400">{state.message}</p>;
  return <PublicSkyMap username={username} />;
}

export default function ExploreSection() {
  const [inputValue, setInputValue] = useState("");
  const [submittedUsername, setSubmittedUsername] = useState<string | null>(null);

  // Populates from a shared link (?astrobin=<username>) rather than requiring a fresh lookup —
  // deferred to an effect (not read straight into the useState initializer above) so the very
  // first render matches the server-rendered HTML (which has no access to the URL's query string)
  // and React never has to reconcile a hydration mismatch; the brief flash of the empty form
  // before this runs is imperceptible in practice.
  useEffect(() => {
    const shared = new URLSearchParams(window.location.search).get(SHARE_QUERY_PARAM);
    if (shared) {
      setInputValue(shared);
      setSubmittedUsername(shared);
    }
  }, []);

  return (
    <Section id="explore" eyebrow="Try it with your own sky map" title="Explore any AstroBin user">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex max-w-md flex-1 items-center gap-2">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = inputValue.trim();
              if (trimmed) setSubmittedUsername(trimmed);
            }}
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="AstroBin username"
              className="flex-1 rounded-lg border border-white/10 bg-slate-900 px-4 py-2 text-slate-100 placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-lg bg-cyan-500 px-5 py-2 font-medium text-slate-950 transition hover:bg-cyan-400"
            >
              Show
            </button>
          </form>
          {submittedUsername && <ShareButton username={submittedUsername} />}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-400">Enjoyed the view?</span>
          <DonateButton />
        </div>
      </div>

      {submittedUsername && <AstrobinIndexGate key={submittedUsername} username={submittedUsername} />}
    </Section>
  );
}
