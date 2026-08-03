import Section from "./Section";
import AstrobinGalleryGrid from "./AstrobinGalleryGrid";
import { site } from "@/content/site";

export default function GallerySection() {
  return (
    <Section id="gallery" eyebrow="Synced live from AstroBin" title="Latest images">
      <AstrobinGalleryGrid username={site.astrobinUsername} limit={12} />
      <a
        href={`https://app.astrobin.com/u/${site.astrobinUsername}`}
        target="_blank"
        rel="noreferrer noopener"
        className="mt-6 inline-block text-sm text-cyan-400 hover:text-cyan-300"
      >
        See the full gallery on AstroBin →
      </a>
    </Section>
  );
}
