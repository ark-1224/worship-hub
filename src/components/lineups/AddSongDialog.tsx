"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PickerSong } from "./types";

// "Add song" picker: a searchable list of the library, in a native <dialog>
// (the browser handles focus trapping and the Esc key). It stays open after
// each add so several songs can be added in a row; songs already in the
// lineup are greyed out.
export function AddSongDialog({
  open,
  onClose,
  songs,
  inLineup,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  songs: PickerSong[];
  inLineup: Set<string>;
  onAdd: (song: PickerSong) => Promise<void>;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  // Keep the native dialog in step with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const q = query.trim().toLowerCase();
  const matches = songs.filter(
    (s) => !q || s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q),
  );

  const add = async (song: PickerSong) => {
    setAdding(song.id);
    await onAdd(song);
    setAdding(null);
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="add-song-title"
      className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-white p-0 text-stone-900 shadow-xl backdrop:bg-black/40 sm:inset-0 sm:m-auto sm:max-h-[80dvh] sm:max-w-lg sm:rounded-2xl"
    >
      <div className="flex max-h-[85dvh] flex-col sm:max-h-[80dvh]">
        <div className="space-y-3 border-b border-stone-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 id="add-song-title" className="text-lg font-bold">
              Add songs
            </h2>
            <button type="button" onClick={onClose} className="btn-primary min-h-10 px-4">
              Done
            </button>
          </div>
          <label htmlFor="song-search" className="sr-only">
            Search songs by title or artist
          </label>
          <input
            id="song-search"
            type="search"
            placeholder="Search title or artist"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input"
          />
        </div>

        <ul className="divide-y divide-stone-100 overflow-y-auto overscroll-contain">
          {matches.map((song) => {
            const already = inLineup.has(song.id);
            return (
              <li key={song.id}>
                <button
                  type="button"
                  disabled={already || adding === song.id}
                  onClick={() => add(song)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left hover:bg-stone-50 disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{song.title}</span>
                    {song.artist && <span className="block truncate text-sm text-stone-600">{song.artist}</span>}
                  </span>
                  {song.originalKey && (
                    <span className="w-10 shrink-0 rounded-md bg-accent-50 py-0.5 text-center text-sm font-bold text-accent-700">
                      {song.originalKey}
                    </span>
                  )}
                  <span className="w-20 shrink-0 text-right text-sm font-semibold text-accent-700">
                    {already ? "In lineup" : adding === song.id ? "Adding…" : "+ Add"}
                  </span>
                </button>
              </li>
            );
          })}
          {matches.length === 0 && (
            <li className="p-4 text-stone-600">
              {songs.length === 0 ? (
                <>
                  The library is empty.{" "}
                  <Link href="/songs/new" className="font-semibold text-accent-700 underline">
                    Add a song first
                  </Link>
                  .
                </>
              ) : (
                `No songs match “${query.trim()}”.`
              )}
            </li>
          )}
        </ul>
      </div>
    </dialog>
  );
}
