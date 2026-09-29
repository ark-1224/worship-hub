import Link from "next/link";
import { appTimezone, formatServiceDate, formatServiceTime, todayIn } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/server";

type NextLineup = {
  id: string;
  title: string;
  service_date: string;
  service_time: string | null;
  service_type: string | null;
  lineup_items: {
    id: string;
    position: number;
    key_override: string | null;
    song: { id: string; title: string; original_key: string | null } | null;
  }[];
};

export default async function HomePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Row Level Security lets a member read profiles, so this is just their name.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", claims?.claims.sub ?? "")
    .maybeSingle();

  // The soonest lineup that is today or later, in the team's time zone.
  const { data: next } = await supabase
    .from("lineups")
    .select(
      "id, title, service_date, service_time, service_type, lineup_items(id, position, key_override, song:songs(id, title, original_key))",
    )
    .is("archived_at", null)
    .gte("service_date", todayIn(appTimezone()))
    .order("service_date", { ascending: true })
    .order("service_time", { ascending: true, nullsFirst: false })
    .order("position", { referencedTable: "lineup_items" })
    .limit(1)
    .maybeSingle();

  const lineup = next as NextLineup | null;
  const when = lineup
    ? [formatServiceDate(lineup.service_date), formatServiceTime(lineup.service_time)].filter(Boolean).join(" · ")
    : "";

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hi{profile?.name ? `, ${profile.name}` : ""} 👋</h1>

      <section aria-label="Next lineup" className="card space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-accent-700">Next lineup</h2>
        {lineup ? (
          <>
            <div>
              <Link href={`/lineups/${lineup.id}`} className="text-xl font-bold hover:underline">
                {lineup.title}
              </Link>
              <p className="text-stone-600">
                {when}
                {lineup.service_type ? ` · ${lineup.service_type}` : ""}
              </p>
            </div>
            {lineup.lineup_items.length === 0 ? (
              <p className="text-stone-600">No songs added yet.</p>
            ) : (
              <ol className="divide-y divide-stone-100">
                {lineup.lineup_items.map((item, i) => (
                  <li key={item.id}>
                    <Link
                      href={`/songs/${item.song?.id}${item.key_override ? `?key=${encodeURIComponent(item.key_override)}` : ""}`}
                      className="flex min-h-12 items-center gap-3 py-2 hover:bg-stone-50"
                    >
                      <span className="w-6 shrink-0 text-center font-bold text-stone-400">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate font-medium">{item.song?.title ?? "Unknown song"}</span>
                      {(item.key_override ?? item.song?.original_key) && (
                        <span className="w-12 shrink-0 rounded-md bg-accent-50 py-1 text-center text-sm font-bold text-accent-700">
                          {item.key_override ?? item.song?.original_key}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/lineups/${lineup.id}`} className="btn-secondary w-full sm:w-auto">
                Open lineup
              </Link>
              {lineup.lineup_items.length > 0 && (
                <Link href={`/lineups/${lineup.id}/stage`} className="btn-primary w-full sm:w-auto">
                  ▶ Stage mode
                </Link>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-stone-600">No upcoming lineup yet.</p>
            <Link href="/lineups/new" className="btn-primary w-full sm:w-auto">
              Create this Sunday&apos;s lineup
            </Link>
          </>
        )}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link href="/songs" className="card block hover:border-accent-600">
          <span className="text-lg font-semibold">Song library</span>
          <span className="mt-1 block text-stone-600">Find a song, view chords, transpose.</span>
        </Link>
        <Link href="/songs/new" className="card block hover:border-accent-600">
          <span className="text-lg font-semibold">Add song</span>
          <span className="mt-1 block text-stone-600">Paste a chord sheet or type ChordPro.</span>
        </Link>
        <Link href="/lineups/new" className="card block hover:border-accent-600">
          <span className="text-lg font-semibold">New lineup</span>
          <span className="mt-1 block text-stone-600">Plan the songs for a service.</span>
        </Link>
      </div>
    </div>
  );
}
