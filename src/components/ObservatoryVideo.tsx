"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

const VIDEO_SRC = "/obsyAnimation.mp4";

/** The scroll-driven background: the user's own footage of their observatory (night sky +
 *  telescope), scrubbed by scroll position across the whole page rather than played back on a
 *  timer — scrolling down/up moves forward/back through the clip, so it reads as "your scroll
 *  position controls the sky", the same idea TelescopeRig's SVG rotation used to approximate. */
export default function ObservatoryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const { scrollYProgress } = useScroll();

  // Fully downloads the clip into memory before rendering the <video> at all, then hands it a
  // blob: URL instead of the network path — every scroll-driven seek from that point on reads
  // from the in-memory blob rather than depending on the network. The file gets downloaded in
  // full either way (see public/obsyAnimation.mp4's own encode notes — re-encoded down to ~1.5MB
  // specifically so this is fast); the point is making sure that's already finished before
  // scrubbing starts, rather than trying to out-prioritize whatever else the page happens to be
  // loading at the same time.
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    fetch(VIDEO_SRC)
      .then((res) => res.blob())
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        // Falls back to the plain network path — still works, just back to being subject to
        // per-seek buffering instead of being fully local.
        if (!cancelled) setSrc(VIDEO_SRC);
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    const onLoaded = () => setDuration(video.duration || 0);
    // A cached video (revisits, or just a fast load) can have metadata ready before this effect
    // ever attaches its listener — readyState >= 1 (HAVE_METADATA) means "loadedmetadata" already
    // fired and this component missed it, so `duration` would otherwise be stuck at 0 forever and
    // the scroll handler below would silently never seek at all.
    if (video.readyState >= 1) {
      onLoaded();
    } else {
      video.addEventListener("loadedmetadata", onLoaded);
    }
    // Autoplay only to satisfy browsers that refuse to seek a never-played <video> until it's
    // started once — paused again immediately, since scroll (not playback) drives currentTime.
    video.play().catch(() => {}).finally(() => video.pause());
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, [src]);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const target = progress * duration;
    // Half a frame's worth of dead zone — skips redundant seeks to (effectively) the same frame
    // firing on every pixel of scroll.
    if (Math.abs(video.currentTime - target) < 1 / 48) return;
    video.currentTime = target;
  });

  if (!src) return null;

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 -z-10 h-screen w-screen object-cover opacity-60"
      src={src}
    />
  );
}
