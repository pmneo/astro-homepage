import { notFound } from "next/navigation";
import Section from "@/components/Section";
import { getStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

function formatDate(ms: number): string {
  return new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-slate-900 p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-slate-100">{value}</dd>
    </div>
  );
}

/** Owner-only usage dashboard — gated behind the same shared secret as GET /api/stats (see
 *  README's CACHE_EVICT_SECRET), just rendered as a readable page instead of raw JSON. Not linked
 *  from Nav; 404s outright (not a 403) on a missing/wrong secret so an unauthenticated visitor
 *  can't tell the difference between "wrong secret" and "no such page". */
export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ secret?: string }>;
}) {
  const secret = process.env.CACHE_EVICT_SECRET;
  const { secret: supplied } = await searchParams;
  if (!secret || supplied !== secret) {
    notFound();
  }

  const stats = await getStats();
  const usernames = Object.keys(stats.exploredUsernames).sort(
    (a, b) => (stats.lastExploredAt[b] ?? 0) - (stats.lastExploredAt[a] ?? 0),
  );

  return (
    <Section id="stats" eyebrow="Owner only" title="Usage stats">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Distinct page views" value={stats.pageViews} />
        <Stat label="Distinct explore uses" value={usernames.length} />
        <Stat label="Donate clicks" value={stats.donateClicks} />
        <Stat label="Tracking since" value={formatDate(stats.since)} />
      </dl>

      <h3 className="mt-12 mb-4 text-xl font-semibold text-slate-100">Explored usernames</h3>
      {usernames.length === 0 ? (
        <p className="text-slate-500">No lookups yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="py-2 pr-4 font-medium">Username</th>
              <th className="py-2 pr-4 font-medium">Lookups</th>
              <th className="py-2 font-medium">Last lookup</th>
            </tr>
          </thead>
          <tbody>
            {usernames.map((username) => (
              <tr key={username} className="border-b border-white/5">
                <td className="py-2 pr-4 text-slate-100">{username}</td>
                <td className="py-2 pr-4 text-slate-300">{stats.exploredUsernames[username]}</td>
                <td className="py-2 text-slate-300">
                  {stats.lastExploredAt[username] ? formatDate(stats.lastExploredAt[username]) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
