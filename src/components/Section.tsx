import type { ReactNode } from "react";

interface SectionProps {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}

// Deliberately translucent (not a solid background) — the fixed Starfield/TelescopeRig behind the
// page content should stay faintly visible through every section, not just in the hero.
export default function Section({ id, eyebrow, title, children, className }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative border-t border-white/5 bg-slate-950/70 px-6 py-20 backdrop-blur-sm sm:px-10 ${className ?? ""}`}
    >
      <div className="mx-auto max-w-5xl">
        {eyebrow && (
          <p className="mb-2 text-sm font-medium uppercase tracking-[0.2em] text-cyan-400">
            {eyebrow}
          </p>
        )}
        <h2 className="mb-10 text-3xl font-semibold text-slate-100 sm:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}
