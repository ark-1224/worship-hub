import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { restoreLineup, restoreSong } from "@/app/(app)/archive/actions";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { appTimezone, formatServiceDate, formatTimestamp } from "@/lib/lineups";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Archive" };

type ArchivedSong = { id: string; title: string; artist: string | null; archived_at: string };
type ArchivedLineup = { id: string; title: string; service_date: string | null; archived_at: string };

// Admin-only page. Members who type the address are sent home; and even if the
// page were shown, the database would refuse their "Restore" clicks.
export default async function ArchivePage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (isAdmin !== true) redirect("/");

  const [songsResult, lineupsResult] = await Promise.all([
    supabase
      .from("songs")
      .select("id, title, artist, archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
    supabase
      .from("lineups")
      .select("id, title, service_date, archived_at")
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false }),
  ]);
  const songs = (songsResult.data ?? []) as ArchivedSong[];
  const lineups = (lineupsResult.data ?? []) as ArchivedLineup[];
  const tz = appTimezone();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Archive</h1>
        <p className="text-stone-600">
          Archived songs and lineups are hidden from everyone else but never erased. Restore one to bring it back.
        </p>
      </header>

      <section className="space-y-2" aria-labelledby="songs-heading">
        <h2 id="songs-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Songs ({songs.length})
        </h2>
        {songs.length === 0 ? (
          <p className="card text-stone-600">No archived songs.</p>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            {songs.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/songs/${s.id}`} className="font-semibold hover:underline">
                    {s.title}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {s.artist ? `${s.artist} · ` : ""}archived {formatTimestamp(s.archived_at, tz)}
                  </p>
                </div>
                <ConfirmActionButton
                  compact
                  variant="secondary"
                  action={restoreSong.bind(null, s.id)}
                  label="Restore"
                  pendingLabel="Restoring…"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2" aria-labelledby="lineups-heading">
        <h2 id="lineups-heading" className="text-sm font-bold uppercase tracking-wide text-stone-500">
          Lineups ({lineups.length})
        </h2>
        {lineups.length === 0 ? (
          <p className="card text-stone-600">No archived lineups.</p>
        ) : (
          <ul className="divide-y divide-stone-200 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            {lineups.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/lineups/${l.id}`} className="font-semibold hover:underline">
                    {l.title}
                  </Link>
                  <p className="text-sm text-stone-500">
                    {formatServiceDate(l.service_date)} · archived {formatTimestamp(l.archived_at, tz)}
                  </p>
                </div>
                <ConfirmActionButton
                  compact
                  variant="secondary"
                  action={restoreLineup.bind(null, l.id)}
                  label="Restore"
                  pendingLabel="Restoring…"
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
