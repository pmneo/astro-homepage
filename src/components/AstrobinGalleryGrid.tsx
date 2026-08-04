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

// Colors match AstroBin's own badge palette (gold/silver/bronze/blue) exactly, sampled from
// app.astrobin.com's own gallery grid.
const BADGE_COLOR: Record<NonNullable<GalleryImage["badge"]>, string> = {
  iotd: "#ffd700",
  "top-pick": "#c0c0c0",
  "top-pick-nomination": "#cd7f32",
};
const COLLABORATION_COLOR = "#3092cf";

function badgeGlowStyle(color: string): React.CSSProperties {
  return { backgroundColor: color, boxShadow: `0 1px 5px rgba(0,0,0,.8), 0 0 10px ${color}` };
}

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

// Font Awesome "users" glyph (fa-users) — same icon AstroBin itself uses for the collaboration badge.
function UsersIcon() {
  return (
    <svg viewBox="0 0 640 512" width="12" height="12" fill="currentColor">
      <path d="M144 0a80 80 0 1 1 0 160A80 80 0 1 1 144 0zM512 0a80 80 0 1 1 0 160A80 80 0 1 1 512 0zM0 298.7C0 239.8 47.8 192 106.7 192l42.7 0c15.9 0 31 3.5 44.6 9.7c-1.3 7.2-1.9 14.7-1.9 22.3c0 38.2 16.8 72.5 43.3 96c-.2 0-.4 0-.7 0L21.3 320C9.6 320 0 310.4 0 298.7zM405.3 320c-.2 0-.4 0-.7 0c26.6-23.5 43.3-57.8 43.3-96c0-7.6-.7-15-1.9-22.3c13.6-6.3 28.7-9.7 44.6-9.7l42.7 0C592.2 192 640 239.8 640 298.7c0 11.8-9.6 21.3-21.3 21.3l-213.3 0zM224 224a96 96 0 1 1 192 0 96 96 0 1 1 -192 0zM128 485.3C128 411.7 187.7 352 261.3 352l117.3 0C452.3 352 512 411.7 512 485.3c0 14.7-11.9 26.7-26.7 26.7l-330.7 0c-14.7 0-26.7-11.9-26.7-26.7z" />
    </svg>
  );
}

// Font Awesome "star" glyph (fa-star) — AstroBin's own top-pick badge icon.
function StarIcon() {
  return (
    <svg viewBox="0 0 576 512" width="12" height="12" fill="currentColor">
      <path d="M316.9 18C311.6 7 300.4 0 288.1 0s-23.4 7-28.8 18L195 150.3 51.4 171.5c-12 1.8-22 10.2-25.7 21.7s-.7 24.2 7.9 32.7L137.8 329 113.2 474.7c-2 12 3 24.2 12.9 31.3s23 8 33.8 2.3l128.3-68.5 128.3 68.5c10.8 5.7 23.9 4.9 33.8-2.3s14.9-19.3 12.9-31.3L438.5 329 542.7 225.9c8.6-8.5 11.7-21.2 7.9-32.7s-13.7-19.9-25.7-21.7L381.2 150.3 316.9 18z" />
    </svg>
  );
}

// Font Awesome "arrow-up" glyph (fa-arrow-up), rotated 25° — AstroBin's own top-pick-nomination
// badge icon; the rotation is a global rule AstroBin applies to every arrow-up icon on the site.
function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 384 512" width="12" height="12" fill="currentColor" style={{ transform: "rotate(25deg)" }}>
      <path d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2 160 448c0 17.7 14.3 32 32 32s32-14.3 32-32l0-306.7L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z" />
    </svg>
  );
}

// Font Awesome "trophy" glyph (fa-trophy) — AstroBin's own IOTD badge icon.
function TrophyIcon() {
  return (
    <svg viewBox="0 0 576 512" width="12" height="12" fill="currentColor">
      <path d="M400 0L176 0c-26.5 0-48.1 21.8-47.1 48.2c.2 5.3 .4 10.6 .7 15.8L24 64C10.7 64 0 74.7 0 88c0 92.6 33.5 157 78.5 200.7c44.3 43.1 98.3 64.8 138.1 75.8c23.4 6.5 39.4 26 39.4 45.6c0 20.9-17 37.9-37.9 37.9L192 448c-17.7 0-32 14.3-32 32s14.3 32 32 32l192 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-26.1 0C337 448 320 431 320 410.1c0-19.6 15.9-39.2 39.4-45.6c39.9-11 93.9-32.7 138.2-75.8C542.5 245 576 180.6 576 88c0-13.3-10.7-24-24-24L446.4 64c.3-5.2 .5-10.4 .7-15.8C448.1 21.8 426.5 0 400 0zM48.9 112l84.4 0c9.1 90.1 29.2 150.3 51.9 190.6c-24.9-11-50.8-26.5-73.2-48.3c-32-31.1-58-76-63-142.3zM464.1 254.3c-22.4 21.8-48.3 37.3-73.2 48.3c22.7-40.3 42.8-100.5 51.9-190.6l84.4 0c-5.1 66.3-31.1 111.2-63 142.3z" />
    </svg>
  );
}

function BadgeIcon({ badge }: { badge: NonNullable<GalleryImage["badge"]> }) {
  if (badge === "top-pick") return <StarIcon />;
  if (badge === "top-pick-nomination") return <ArrowUpIcon />;
  return <TrophyIcon />;
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

          {(image.badge || image.collaboratorUsernames.length > 0) && (
            <span className="absolute left-1.5 top-1.5 flex items-center gap-1">
              {image.badge && (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white text-white"
                  style={badgeGlowStyle(BADGE_COLOR[image.badge])}
                  title={BADGE_LABEL[image.badge]}
                >
                  <BadgeIcon badge={image.badge} />
                </span>
              )}
              {image.collaboratorUsernames.length > 0 && (
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-white text-white"
                  style={badgeGlowStyle(COLLABORATION_COLOR)}
                  title={`Collaboration with ${image.collaboratorUsernames.join(", ")}`}
                >
                  <UsersIcon />
                </span>
              )}
            </span>
          )}

          {/* Hover overlay — confined to the bottom quarter (like AstroBin's own gallery grid),
           * not a fullscreen scrim: title on top, view/like/bookmark/comment counts below it. */}
          <span className="absolute inset-x-0 bottom-0 flex h-1/4 flex-col justify-end gap-1 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
            <span className="truncate text-xs text-slate-100">{image.title}</span>
            <span className="flex items-center gap-3 text-[11px] text-slate-300">
              <Stat icon={<EyeIcon />} count={image.viewCount} />
              <Stat icon={<HeartIcon />} count={image.likeCount} />
              <Stat icon={<BookmarkIcon />} count={image.bookmarkCount} />
              <Stat icon={<CommentIcon />} count={image.commentCount} />
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}
