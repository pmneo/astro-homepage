import Section from "./Section";
import { site } from "@/content/site";

export default function ObservatorySection() {
  return (
    <Section id="observatory" eyebrow="The garden observatory" title={site.location.name}>
      <div className="grid gap-8 sm:grid-cols-[1fr_1fr] sm:gap-12">
        <p className="whitespace-pre-line text-slate-300">{site.about}</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 self-start text-sm">
          <dt className="text-slate-500">Location</dt>
          <dd className="text-slate-200">{site.location.place}</dd>
          <dt className="text-slate-500">Roof</dt>
          <dd className="text-slate-200">Roll-off, remote controlled</dd>
          <dt className="text-slate-500">Status</dt>
          <dd className="text-slate-200">Polar-aligned & parked, ready to open</dd>
        </dl>
      </div>
    </Section>
  );
}
