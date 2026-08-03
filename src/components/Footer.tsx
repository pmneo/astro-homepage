import Section from "./Section";
import DonateButton from "./DonateButton";
import { site } from "@/content/site";

export default function Footer() {
  return (
    <Section id="support" title="Enjoyed the view?" className="text-center">
      <div className="flex flex-col items-center gap-6">
        <DonateButton />
        <p className="text-sm text-slate-500">
          © {new Date().getFullYear()} {site.name} · Images and equipment data via{" "}
          <a
            href={`https://app.astrobin.com/u/${site.astrobinUsername}`}
            target="_blank"
            rel="noreferrer noopener"
            className="text-cyan-400 hover:text-cyan-300"
          >
            AstroBin
          </a>
        </p>
      </div>
    </Section>
  );
}
