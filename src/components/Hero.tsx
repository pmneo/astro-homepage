import { site } from "@/content/site";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="mb-4 text-sm font-medium uppercase tracking-[0.3em] text-cyan-400">
        {site.location.name} · {site.location.place}
      </p>
      <h1 className="max-w-3xl text-4xl font-semibold text-slate-100 sm:text-6xl">
        {site.name}
      </h1>
      <p className="mt-6 max-w-xl text-lg text-slate-300 sm:text-xl">{site.tagline}</p>
      <a
        href="#gallery"
        className="mt-10 rounded-full border border-cyan-400/40 px-6 py-3 text-sm font-medium text-cyan-300 transition hover:border-cyan-300 hover:bg-cyan-400/10"
      >
        See the latest images ↓
      </a>
    </section>
  );
}
