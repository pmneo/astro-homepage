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
    video.addEventListener("loadedmetadata", onLoaded);
    // Autoplay only to satisfy browsers that refuse to seek a never-played <video> until it's
    // started once — paused again immediately, since scroll (not playback) drives currentTime.
    video.play().catch(() => {}).finally(() => video.pause());
    return () => video.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = progress * duration;
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
