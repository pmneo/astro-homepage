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
        <BuildInfo />
      </div>
    </Section>
  );
}

/** Which commit this deploy is actually running — set at build time from the git checkout being
 *  built (see next.config.ts's getGitSha), not a Plesk-configured env var, so it can't silently go
 *  stale/unset the way NEXT_PUBLIC_PAYPAL_BUSINESS did. Mainly for confirming a Plesk auto-deploy
 *  actually picked up the latest push. */
function BuildInfo() {
  const sha = process.env.NEXT_PUBLIC_GIT_SHA;
  if (!sha || sha === "unknown") return null;
  return (
    <a
      href={`https://github.com/pmneo/astro-homepage/commit/${sha}`}
      target="_blank"
      rel="noreferrer noopener"
      className="font-mono text-xs text-slate-600 hover:text-slate-400"
    >
      build {sha}
    </a>
  );
}
