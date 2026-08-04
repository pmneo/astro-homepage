"use client";

import { useEffect, useRef, useState } from "react";
import { useScroll, useMotionValueEvent } from "framer-motion";

/** The scroll-driven background: the user's own footage of their observatory (night sky +
 *  telescope), scrubbed by scroll position across the whole page rather than played back on a
 *  timer — scrolling down/up moves forward/back through the clip, so it reads as "your scroll
 *  position controls the sky", the same idea TelescopeRig's SVG rotation used to approximate. */
export default function ObservatoryVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const { scrollYProgress } = useScroll();

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLoaded = () => setDuration(video.duration || 0);
    // A cached video (revisits, or just a fast local/CDN load) can have metadata ready before this
    // effect ever attaches its listener — readyState >= 1 (HAVE_METADATA) means "loadedmetadata"
    // already fired and this component missed it, so `duration` would otherwise be stuck at 0
    // forever and the scroll handler below would silently never seek at all.
    if (video.readyState >= 1) {
      onLoaded();
    } else {
      video.addEventListener("loadedmetadata", onLoaded);
    }
    // Autoplay only to satisfy browsers that refuse to seek a never-played <video> until it's
    // started once — paused again immediately, since scroll (not playback) drives currentTime.
    video.play().catch(() => {}).finally(() => video.pause());
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const target = progress * duration;
    // Half a frame's worth of dead zone — skips redundant seeks to (effectively) the same frame
    // firing on every pixel of scroll, on top of what re-encoding the source with a keyframe per
    // frame already did for the cost of each individual seek (see public/obsyAnimation.mp4's own
    // encode settings — this video used to have exactly one keyframe for its whole 8s length,
    // so every seek had to decode forward from frame 0; that was the actual jank, not this).
    if (Math.abs(video.currentTime - target) < 1 / 48) return;
    video.currentTime = target;
  });

  return (
    <video
      ref={videoRef}
      aria-hidden
      muted
      playsInline
      preload="auto"
      className="fixed inset-0 -z-10 h-screen w-screen object-cover opacity-60"
      src="/obsyAnimation.mp4"
    />
  );
}
