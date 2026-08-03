import Section from "./Section";
import PublicSkyMap from "./PublicSkyMap";
import { site } from "@/content/site";

export default function SkyMapSection() {
  return (
    <Section id="sky-map" eyebrow="Where it's all pointed" title="Sky map">
      <PublicSkyMap username={site.astrobinUsername} />
    </Section>
  );
}
