import Section from "./Section";
import AstrobinSkyMap from "./AstrobinSkyMap";
import { site } from "@/content/site";

export default function SkyMapSection() {
  return (
    <Section id="sky-map" eyebrow="Where it's all pointed" title="Sky map">
      <AstrobinSkyMap username={site.astrobinUsername} />
    </Section>
  );
}
