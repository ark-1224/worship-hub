import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LineupForm } from "@/components/lineups/LineupForm";
import { formatServiceDate, formatServiceTime } from "@/lib/lineups";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lineup" };

type Item = {
  id: string;
  position: number;
  key_override: string | null;
  note: string | null;
  song: { id: string; title: string; artist: string | null; original_key: string | null } | null;
  leader: { name: string } | null;
};

export default async function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: lineup } = await supabase
    .from("lineups")
    .select(
      "*, lineup_items(id, position, key_override, note, song:songs(id, title, artist, original_key), leader:profiles(name))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "lineup_items" })
    .maybeSingle();
  if (!lineup) notFound();

  const items = (lineup.lineup_items ?? []) as Item[];
  const when = [formatServiceDate(lineup.service_date), formatServiceTime(lineup.service_time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{lineup.title}</h1>
        <p className="text-stone-600">
          {when}
          {lineup.service_type ? ` · ${lineup.service_type}` : ""}
        </p>
        {lineup.notes && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
            {lineup.notes}
          </p>
        )}
      </header>

      <details className="group">
        <summary className="btn-secondary w-full cursor-pointer list-none sm:w-auto">Edit details</summary>
        <div className="mt-3">
          <LineupForm
            initial={{
              id: lineup.id,
              title: lineup.title,
              serviceDate: lineup.service_date ?? "",
              serviceTime: (lineup.service_time ?? "").slice(0, 5),
              serviceType: lineup.service_type ?? "",
              notes: lineup.notes ?? "",
            }}
          />
        </div>
      </details>

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-stone-500">Songs</h2>
        {items.length === 0 ? (
          <p className="card text-stone-600">No songs yet.</p>
        ) : (
          <ol className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            {items.map((item, i) => (
              <li key={item.id}>
                <Link
                  href={`/songs/${item.song?.id}${item.key_override ? `?key=${encodeURIComponent(item.key_override)}` : ""}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-stone-50"
                >
                  <span className="w-6 shrink-0 text-center font-bold text-stone-400">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{item.song?.title ?? "Unknown song"}</p>
                    <p className="truncate text-sm text-stone-600">
                      {[item.leader?.name && `Lead: ${item.leader.name}`, item.note].filter(Boolean).join(" · ")}
                    </p>
                  </div>
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
        <p className="text-sm text-stone-500">Adding and reordering songs comes in the next step.</p>
      </section>
    </div>
  );
}
