"use client";

import { useEffect, useState } from "react";
import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";

type IndexState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

function LoadingBar() {
  return (
    <div className="h-1 w-full max-w-md overflow-hidden rounded-full bg-slate-800">
      <div
        className="h-full w-1/3 rounded-full bg-cyan-400"
        style={{ animation: "loading-bar-slide 1.1s ease-in-out infinite" }}
      />
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
        if (!cancelled) setState({ status: "ready" });
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

  return (
    <Section id="explore" eyebrow="Try it with your own sky map" title="Explore any AstroBin user">
      <form
        className="mb-8 flex max-w-md gap-2"
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

      {submittedUsername && <AstrobinIndexGate key={submittedUsername} username={submittedUsername} />}
    </Section>
  );
}
