import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChordSheet } from "@/components/songs/ChordSheet";
import { parseChordPro } from "@/lib/chords/chordpro";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Song" };

// Basic song view. Transpose controls and the YouTube player arrive in step (c).
export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const { data: song } = await supabase.from("songs").select("*").eq("id", id).maybeSingle();
  if (!song) notFound();

  return (
    <article className="space-y-5">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{song.title}</h1>
            {song.artist && <p className="text-stone-600">{song.artist}</p>}
          </div>
          <Link href={`/songs/${song.id}/edit`} className="btn-secondary shrink-0">
            Edit
          </Link>
        </div>

        <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-stone-700">
          {song.original_key && (
            <div>
              <dt className="inline text-stone-500">Key </dt>
              <dd className="inline font-semibold">{song.original_key}</dd>
            </div>
          )}
          {song.bpm && (
            <div>
              <dt className="inline text-stone-500">BPM </dt>
              <dd className="inline font-semibold">{song.bpm}</dd>
            </div>
          )}
        </dl>

        {song.tags?.length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {song.tags.map((tag: string) => (
              <li key={tag} className="rounded-full bg-accent-100 px-2.5 py-0.5 text-xs font-medium text-accent-700">
                {tag}
              </li>
            ))}
          </ul>
        )}
      </header>

      {song.notes && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm whitespace-pre-line text-amber-900">
          {song.notes}
        </p>
      )}

      <div className="card overflow-x-auto">
        <ChordSheet lines={parseChordPro(song.chord_text ?? "")} />
      </div>
    </article>
  );
}
