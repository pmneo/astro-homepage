"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { GalleryImage } from "@/lib/astrobin";

interface Props {
  username: string;
  /** Caps how many images render — the full gallery can be a few hundred images, which is
   *  overkill for an embedded grid (see ExploreSection, which shows any visitor-entered gallery). */
  limit?: number;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; images: GalleryImage[] };

const BADGE_LABEL: Record<NonNullable<GalleryImage["badge"]>, string> = {
  iotd: "IOTD",
  "top-pick": "Top Pick",
  "top-pick-nomination": "TP Nomination",
};

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9Z" />
    </svg>
  );
}

function BookmarkIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12v18l-6-4-6 4V3Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16v12H8l-4 4V4Z" />
    </svg>
  );
}

function Stat({ icon, count }: { icon: React.ReactNode; count: number }) {
  return (
    <span className="flex items-center gap-1">
      {icon}
      {count}
    </span>
  );
}

export default function AstrobinGalleryGrid({ username, limit = 12 }: Props) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/astrobin/${encodeURIComponent(username)}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(res.status === 404 ? `No AstroBin user named "${username}"` : "AstroBin is unreachable right now");
        }
        return res.json() as Promise<{ images: GalleryImage[] }>;
      })
      .then((data) => {
        if (!cancelled) setState({ status: "ready", images: data.images });
      })
      .catch((err: Error) => {
        if (!cancelled) setState({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (state.status === "loading") {
    return <p className="text-slate-500">Loading images from AstroBin…</p>;
  }
  if (state.status === "error") {
    return <p className="text-rose-400">{state.message}</p>;
  }
  if (state.images.length === 0) {
    return <p className="text-slate-500">No plate-solvable images published yet.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {state.images.slice(0, limit).map((image) => (
        <a
          key={image.hash}
          href={image.url}
          target="_blank"
          rel="noreferrer noopener"
          className="group relative aspect-square overflow-hidden rounded-lg bg-slate-900"
        >
          {image.thumbnailUrl && (
            <Image
              src={image.thumbnailUrl}
              alt={image.title}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
              unoptimized
            />
          )}

          {image.collaboratorUsernames.length > 0 && (
            <span
              className="absolute left-1.5 top-1.5 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-medium text-slate-100"
              title={`Collaboration with ${image.collaboratorUsernames.join(", ")}`}
            >
              🤝 Collaboration
            </span>
          )}
          {image.badge && (
            <span className="absolute right-1.5 top-1.5 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-semibold text-slate-950">
              {BADGE_LABEL[image.badge]}
            </span>
          )}

          {/* Hover overlay — same idea as AstroBin's own gallery grid: a dark scrim with
           * view/like/bookmark/comment counts, title pinned to the bottom edge. */}
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-slate-100 opacity-0 transition group-hover:opacity-100">
            <span className="flex items-center gap-3 text-xs">
              <Stat icon={<EyeIcon />} count={image.viewCount} />
              <Stat icon={<HeartIcon />} count={image.likeCount} />
              <Stat icon={<BookmarkIcon />} count={image.bookmarkCount} />
              <Stat icon={<CommentIcon />} count={image.commentCount} />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-xs text-slate-100 opacity-0 transition group-hover:opacity-100">
            {image.title}
          </span>
        </a>
      ))}
    </div>
  );
}
