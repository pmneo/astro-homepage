import Section from "./Section";
import { site } from "@/content/site";

export default function EquipmentSection() {
  return (
    <Section id="equipment" eyebrow="What it's shot with" title="Equipment">
      <div className="grid gap-8 sm:grid-cols-2">
        {site.equipment.map((group) => (
          <div key={group.category}>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-cyan-400">
              {group.category}
            </h3>
            <ul className="space-y-2">
              {group.items.map((item) => (
                <li key={item.name} className="text-slate-200">
                  {item.name}
                  {item.note && <span className="block text-sm text-slate-500">{item.note}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Section>
  );
}
