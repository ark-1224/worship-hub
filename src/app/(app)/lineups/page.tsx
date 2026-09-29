import type { Metadata } from "next";
import Link from "next/link";
import { appTimezone, formatServiceDate, formatServiceTime, splitUpcomingPast, todayIn } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lineups" };

type LineupRow = {
  id: string;
  title: string;
  service_date: string | null;
  service_time: string | null;
  service_type: string | null;
  lineup_items: { count: number }[];
};

function LineupList({ lineups }: { lineups: LineupRow[] }) {
  return (
    <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
      {lineups.map((l) => {
        const songCount = l.lineup_items?.[0]?.count ?? 0;
        const when = [formatServiceDate(l.service_date), formatServiceTime(l.service_time)]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={l.id}>
            <Link href={`/lineups/${l.id}`} className="block px-4 py-3 hover:bg-stone-50">
              <p className="font-semibold">{l.title}</p>
              <p className="text-sm text-stone-600">
                {when}
                {l.service_type ? ` · ${l.service_type}` : ""}
              </p>
              <p className="text-sm text-stone-500">
                {songCount} {songCount === 1 ? "song" : "songs"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export default async function LineupsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("lineups")
    .select("id, title, service_date, service_time, service_type, lineup_items(count)")
    .is("archived_at", null);

  const { upcoming, past } = splitUpcomingPast((data ?? []) as LineupRow[], todayIn(appTimezone()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lineups</h1>
        <Link href="/lineups/new" className="btn-primary">
          New lineup
        </Link>
      </div>

      {error && <p className="form-error">Couldn&apos;t load lineups. Please refresh.</p>}

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Upcoming</h2>
        {upcoming.length > 0 ? (
          <LineupList lineups={upcoming} />
        ) : (
          <p className="card text-stone-600">No upcoming lineups. Create one for this Sunday!</p>
        )}
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Past</h2>
          <LineupList lineups={past} />
        </section>
      )}
    </div>
  );
}
