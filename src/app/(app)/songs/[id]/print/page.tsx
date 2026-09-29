import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/components/PrintToolbar";
import { ChordSheet } from "@/components/songs/ChordSheet";
import { prepareChart } from "@/lib/chords/chart";
import { KEY_PATTERN } from "@/lib/chords/keys";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Print song" };

// A printable single song, in the key you were viewing (?key=A) or as saved.
//   ?chords=0  words only
export default async function PrintSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string; chords?: string }>;
}) {
  const { id } = await params;
  const { key, chords } = await searchParams;
  if (!isUuid(id)) notFound();
  const targetKey = key && KEY_PATTERN.test(key) ? key : null;
  const showChords = chords !== "0";

  const supabase = await createClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) notFound();

  const chart = prepareChart(song.chord_text ?? "", song.original_key, targetKey);
  const keyParam = targetKey ? `key=${encodeURIComponent(targetKey)}&` : "";
  const link = (chordsOn: boolean) => `/songs/${id}/print?${keyParam}chords=${chordsOn ? 1 : 0}`;

  return (
    <div className="space-y-6">
      <PrintToolbar
        backHref={`/songs/${id}`}
        backLabel="Back to the song"
        options={[
          { href: link(true), label: "With chords", active: showChords },
          { href: link(false), label: "Lyrics only", active: !showChords },
        ]}
      />

      <article className="space-y-4 text-black">
        <header className="space-y-1 border-b border-stone-300 pb-3">
          <h1 className="text-3xl font-bold">{song.title}</h1>
          <p className="text-lg text-stone-700">
            {[
              song.artist,
              chart.shownKey && `Key ${chart.shownKey}`,
              targetKey && song.original_key && targetKey !== song.original_key ? `(original ${song.original_key})` : null,
              song.bpm && `${song.bpm} BPM`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </header>
        <ChordSheet lines={chart.lines} transposeChord={chart.transpose} fontSizePx={15} showChords={showChords} variant="print" />
      </article>
    </div>
  );
}
