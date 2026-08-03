"use client";

import { motion, useScroll, useTransform } from "framer-motion";

/**
 * A stylized line-art rig — roll-off-roof shed, pier, and a clustered-OTA mount — loosely modeled
 * on the site owner's own "Heimsternwarte" sketch. The OTA cluster rotates around the mount head
 * (its transform-origin) as the whole page scrolls, like it's slewing to track the sky through
 * the night — the "moving sky, rotating telescope" effect tied to scroll position rather than a
 * fixed timer.
 */
export default function TelescopeRig() {
  const { scrollYProgress } = useScroll();
  // Full page scroll [0,1] -> a slew from pointing low in the east to high overhead — deliberately
  // more than 90 degrees of range so the motion stays noticeable even on a very long page.
  const rotate = useTransform(scrollYProgress, [0, 1], [-35, 55]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed bottom-0 right-0 -z-10 h-[42vh] w-[42vh] max-h-[380px] max-w-[380px] opacity-[0.28] sm:opacity-40"
    >
      <svg viewBox="0 0 200 200" className="h-full w-full" fill="none">
        {/* roll-off-roof shed, roof panels slid open to the sides */}
        <rect x="30" y="150" width="140" height="40" stroke="#67e8f9" strokeWidth="1.2" />
        <line x1="10" y1="150" x2="70" y2="130" stroke="#67e8f9" strokeWidth="1.2" />
        <line x1="10" y1="158" x2="70" y2="138" stroke="#67e8f9" strokeWidth="1.2" />
        <line x1="190" y1="150" x2="130" y2="130" stroke="#67e8f9" strokeWidth="1.2" />
        <line x1="190" y1="158" x2="130" y2="138" stroke="#67e8f9" strokeWidth="1.2" />

        {/* pier */}
        <line x1="100" y1="150" x2="100" y2="95" stroke="#67e8f9" strokeWidth="2" />
        <rect x="90" y="88" width="20" height="14" rx="2" stroke="#67e8f9" strokeWidth="1.5" />

        {/* OTA cluster — this group rotates around the mount head */}
        <motion.g style={{ rotate, originX: "100px", originY: "95px" }}>
          <rect x="92" y="30" width="16" height="60" rx="6" stroke="#22d3ee" strokeWidth="1.5" />
          <rect x="72" y="40" width="12" height="45" rx="5" stroke="#22d3ee" strokeWidth="1.2" />
          <rect x="116" y="40" width="12" height="45" rx="5" stroke="#22d3ee" strokeWidth="1.2" />
          <circle cx="100" cy="30" r="9" stroke="#a5f3fc" strokeWidth="1.2" />
        </motion.g>
      </svg>
    </div>
  );
}
