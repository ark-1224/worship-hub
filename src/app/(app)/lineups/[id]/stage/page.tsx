import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StageMode, type StageSong } from "@/components/lineups/StageMode";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Stage mode" };

type ItemRow = {
  id: string;
  key_override: string | null;
  note: string | null;
  leader: { name: string } | null;
  song: { title: string; artist: string | null; original_key: string | null; chord_text: string | null } | null;
};

export default async function StagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: lineup } = await supabase
    .from("lineups")
    .select(
      "id, title, lineup_items(id, position, key_override, note, leader:profiles(name), song:songs(title, artist, original_key, chord_text))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "lineup_items" })
    .maybeSingle();
  if (!lineup) notFound();

  // Every song's chords are sent at once so swiping between songs is instant,
  // even with a weak connection at the venue.
  const songs: StageSong[] = ((lineup.lineup_items ?? []) as unknown as ItemRow[])
    .filter((row) => row.song)
    .map((row) => ({
      itemId: row.id,
      title: row.song!.title,
      artist: row.song!.artist,
      chordText: row.song!.chord_text ?? "",
      originalKey: row.song!.original_key,
      keyOverride: row.key_override,
      leader: row.leader?.name ?? null,
      note: row.note,
    }));

  // ?s=3 opens on the third song (1-based); the address is kept in step as you swipe.
  const { s } = await searchParams;
  const start = Number.parseInt(s ?? "", 10);

  return (
    <StageMode
      lineupId={lineup.id}
      lineupTitle={lineup.title}
      songs={songs}
      startIndex={Number.isInteger(start) ? start - 1 : 0}
    />
  );
}
