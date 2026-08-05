import Section from "./Section";
import ObservatoryStatusList from "./ObservatoryStatusList";
import { site } from "@/content/site";

export default function ObservatorySection() {
  return (
    <Section id="observatory" eyebrow="The garden observatory" title={site.location.name}>
      <div className="grid gap-8 sm:grid-cols-[1fr_1fr] sm:gap-12">
        <p className="whitespace-pre-line text-slate-300">{site.about}</p>
        <ObservatoryStatusList />
      </div>
    </Section>
  );
}
