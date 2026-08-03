const LINKS = [
  { href: "#observatory", label: "Observatory" },
  { href: "#equipment", label: "Equipment" },
  { href: "#gallery", label: "Gallery" },
  { href: "#sky-map", label: "Sky map" },
  { href: "#explore", label: "Explore" },
];

export default function Nav() {
  return (
    <nav className="fixed inset-x-0 top-0 z-20 flex items-center justify-between bg-slate-950/60 px-6 py-4 backdrop-blur-sm sm:px-10">
      <a href="#" className="font-semibold tracking-wide text-slate-100">
        pmneo
      </a>
      <ul className="hidden gap-6 text-sm text-slate-300 sm:flex">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a href={link.href} className="transition hover:text-cyan-300">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
