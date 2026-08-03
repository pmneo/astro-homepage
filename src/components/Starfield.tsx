"use client";

import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  baseAlpha: number;
  twinkleSpeed: number;
  twinklePhase: number;
  layer: number; // 0 = far/slow, 1 = mid, 2 = near/fast — drives parallax speed and size
}

// Layer 0 stars drift the least (they read as "far away"), layer 2 the most — the classic
// multi-layer parallax trick, driven by scroll position rather than a fixed loop so it reads as
// "the sky is tied to how far down the page you are", not just an ambient animation.
const LAYER_PARALLAX = [0.02, 0.06, 0.14];
const STAR_DENSITY_PER_PX2 = 1 / 2600;

function createStars(width: number, height: number): Star[] {
  const count = Math.min(650, Math.floor(width * height * STAR_DENSITY_PER_PX2) + 120);
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const layer = Math.floor(Math.random() * 3);
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: layer === 0 ? Math.random() * 0.6 + 0.3 : layer === 1 ? Math.random() * 0.9 + 0.5 : Math.random() * 1.3 + 0.8,
      baseAlpha: Math.random() * 0.5 + 0.35,
      twinkleSpeed: Math.random() * 0.0015 + 0.0004,
      twinklePhase: Math.random() * Math.PI * 2,
      layer,
    });
  }
  return stars;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let stars = createStars(width, height);
    let animationFrame: number;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      canvas!.style.width = `${width}px`;
      canvas!.style.height = `${height}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      stars = createStars(width, height);
    }
    resize();
    window.addEventListener("resize", resize);

    function draw(timeMs: number) {
      ctx!.clearRect(0, 0, width, height);
      const scrollY = window.scrollY;

      for (const star of stars) {
        const parallaxOffset = scrollY * LAYER_PARALLAX[star.layer];
        // Wrap vertically so stars scrolling off the top re-enter from the bottom instead of the
        // canvas ever running dry as the page gets tall.
        const y = ((star.y - parallaxOffset) % height + height) % height;
        const twinkle = Math.sin(timeMs * star.twinkleSpeed + star.twinklePhase) * 0.5 + 0.5;
        const alpha = star.baseAlpha * (0.5 + twinkle * 0.5);

        ctx!.beginPath();
        ctx!.arc(star.x, y, star.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(226, 232, 240, ${alpha.toFixed(3)})`;
        ctx!.fill();
      }

      animationFrame = requestAnimationFrame(draw);
    }
    animationFrame = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="fixed inset-0 -z-10 h-screen w-screen"
    />
  );
}
