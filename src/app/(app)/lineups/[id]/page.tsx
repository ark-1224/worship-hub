import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArchiveLineupButton } from "@/components/lineups/ArchiveLineupButton";
import { LastEdited } from "@/components/lineups/LastEdited";
import { LineupEditor } from "@/components/lineups/LineupEditor";
import { LineupForm } from "@/components/lineups/LineupForm";
import type { EditorItem, Member, PickerSong } from "@/components/lineups/types";
import { formatServiceDate, formatServiceTime } from "@/lib/lineups";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Lineup" };

type ItemRow = {
  id: string;
  key_override: string | null;
  leader_id: string | null;
  note: string | null;
  song: { id: string; title: string; artist: string | null; original_key: string | null } | null;
};

export default async function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();

  // The lineup with its songs in order and who last edited it, plus what the
  // editor needs: the library (for the "Add song" picker) and the team (for "Leads").
  // `profiles!updated_by` says which of the two links to profiles we mean.
  const [lineupResult, songsResult, membersResult] = await Promise.all([
    supabase
      .from("lineups")
      .select(
        "*, editor:profiles!updated_by(name), lineup_items(id, position, key_override, leader_id, note, song:songs(id, title, artist, original_key))",
      )
      .eq("id", id)
      .order("position", { referencedTable: "lineup_items" })
      .maybeSingle(),
    supabase
      .from("songs")
      .select("id, title, artist, original_key")
      .is("archived_at", null)
      .order("title", { ascending: true }),
    supabase.from("profiles").select("id, name").order("name", { ascending: true }),
  ]);

  const lineup = lineupResult.data;
  if (!lineup) notFound();

  const items: EditorItem[] = ((lineup.lineup_items ?? []) as ItemRow[])
    .filter((row) => row.song) // a song can't be deleted, so this is just a safety net
    .map((row) => ({
      id: row.id,
      songId: row.song!.id,
      title: row.song!.title,
      artist: row.song!.artist,
      originalKey: row.song!.original_key,
      keyOverride: row.key_override,
      leaderId: row.leader_id,
      note: row.note ?? "",
    }));

  const songs: PickerSong[] = (songsResult.data ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    artist: s.artist,
    originalKey: s.original_key,
  }));
  const members: Member[] = membersResult.data ?? [];

  const when = [formatServiceDate(lineup.service_date), formatServiceTime(lineup.service_time)]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      {lineup.archived_at && (
        <p role="status" className="rounded-lg border border-stone-300 bg-stone-100 px-3 py-2 text-sm text-stone-700">
          This lineup is archived, so it no longer shows in the lists. An admin can restore it.
        </p>
      )}

      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{lineup.title}</h1>
        <p className="text-stone-600">
          {when}
          {lineup.service_type ? ` · ${lineup.service_type}` : ""}
        </p>
        <LastEdited name={lineup.editor?.name ?? null} updatedAt={lineup.updated_at} />
        {lineup.notes && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
            {lineup.notes}
          </p>
        )}
      </header>

      <LineupEditor lineupId={lineup.id} initialItems={items} songs={songs} members={members} />

      <details>
        <summary className="btn-secondary w-full cursor-pointer list-none sm:w-auto">Edit lineup details</summary>
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

      {!lineup.archived_at && <ArchiveLineupButton lineupId={lineup.id} title={lineup.title} />}
    </div>
  );
}
