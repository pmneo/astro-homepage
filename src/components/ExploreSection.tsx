"use client";

import { useState } from "react";
import Section from "./Section";
import AstrobinGalleryGrid from "./AstrobinGalleryGrid";
import PublicSkyMap from "./PublicSkyMap";

export default function ExploreSection() {
  const [inputValue, setInputValue] = useState("");
  const [submittedUsername, setSubmittedUsername] = useState<string | null>(null);

  return (
    <Section id="explore" eyebrow="Try it with your own gallery" title="Explore any AstroBin user">
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

      {submittedUsername && (
        // key={submittedUsername} remounts these on every new lookup — both components load
        // their username's data once on mount rather than reacting to prop changes, so a fresh
        // mount is what resets them to a clean loading state for the new user.
        <div key={submittedUsername} className="space-y-10">
          <AstrobinGalleryGrid username={submittedUsername} limit={8} />
          <PublicSkyMap username={submittedUsername} />
        </div>
      )}
    </Section>
  );
}
