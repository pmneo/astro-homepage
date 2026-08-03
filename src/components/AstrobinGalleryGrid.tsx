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
          <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/80 to-transparent px-2 py-2 text-xs text-slate-100 opacity-0 transition group-hover:opacity-100">
            {image.title}
          </span>
        </a>
      ))}
    </div>
  );
}
