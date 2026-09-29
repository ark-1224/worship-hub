"use client";

import { useActionState, useDeferredValue, useMemo, useState } from "react";
import { saveSong } from "@/app/(app)/songs/actions";
import { convertToChordPro } from "@/lib/chords/chordsOverWords";
import { parseChordPro } from "@/lib/chords/chordpro";
import { MAJOR_KEYS, MINOR_KEYS } from "@/lib/chords/keys";
import { parseSpotifyInput, parseYouTubeInput } from "@/lib/links";
import type { SongFormValues } from "@/lib/songs";
import { ChordSheet } from "./ChordSheet";

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SongForm({ initial }: { initial: SongFormValues }) {
  const [state, formAction, pending] = useActionState(saveSong, undefined);
  const [values, setValues] = useState(initial);
  const [editNote, setEditNote] = useState("");
  const isEdit = initial.id !== null;

  const set = <K extends keyof SongFormValues>(key: K, value: SongFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  // Instant link feedback while typing (the server checks again on save).
  const youtubeCheck = parseYouTubeInput(values.youtube);
  const spotifyCheck = parseSpotifyInput(values.spotify);
  const youtubeError = !youtubeCheck.ok ? youtubeCheck.error : state?.fieldErrors?.youtube;
  const spotifyError = !spotifyCheck.ok ? spotifyCheck.error : state?.fieldErrors?.spotify;

  // Live preview: the SAME converter and reader the server uses on save, so the
  // preview shows exactly what will be stored. useDeferredValue keeps typing
  // smooth on long songs and slow phones.
  const deferredChords = useDeferredValue(values.chordText);
  const previewLines = useMemo(
    () => parseChordPro(convertToChordPro(deferredChords)),
    [deferredChords],
  );

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p role="alert" className="form-error">
          {state.error}
        </p>
      )}
      {values.id && <input type="hidden" name="id" value={values.id} />}

      <section className="card space-y-4">
        <div>
          <label htmlFor="title" className="label">
            Title *
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            className="input"
          />
          <FieldError message={state?.fieldErrors?.title} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="artist" className="label">
              Artist
            </label>
            <input
              id="artist"
              name="artist"
              maxLength={200}
              value={values.artist}
              onChange={(e) => set("artist", e.target.value)}
              className="input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="originalKey" className="label">
                Original key
              </label>
              <select
                id="originalKey"
                name="originalKey"
                value={values.originalKey}
                onChange={(e) => set("originalKey", e.target.value)}
                className="input"
              >
                <option value="">—</option>
                <optgroup label="Major">
                  {MAJOR_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Minor">
                  {MINOR_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </optgroup>
              </select>
              <FieldError message={state?.fieldErrors?.originalKey} />
            </div>
            <div>
              <label htmlFor="bpm" className="label">
                BPM (optional)
              </label>
              <input
                id="bpm"
                name="bpm"
                type="number"
                inputMode="numeric"
                min={20}
                max={300}
                value={values.bpm}
                onChange={(e) => set("bpm", e.target.value)}
                className="input"
              />
              <FieldError message={state?.fieldErrors?.bpm} />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="tags" className="label">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="worship, slow, communion"
            value={values.tags}
            onChange={(e) => set("tags", e.target.value)}
            className="input"
          />
          <p className="mt-1 text-xs text-stone-500">Separate with commas.</p>
          <FieldError message={state?.fieldErrors?.tags} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="youtube" className="label">
              YouTube link
            </label>
            <input
              id="youtube"
              name="youtube"
              inputMode="url"
              placeholder="https://youtu.be/…"
              autoCapitalize="none"
              value={values.youtube}
              onChange={(e) => set("youtube", e.target.value)}
              aria-invalid={Boolean(youtubeError)}
              className="input"
            />
            <FieldError message={youtubeError} />
          </div>
          <div>
            <label htmlFor="spotify" className="label">
              Spotify link
            </label>
            <input
              id="spotify"
              name="spotify"
              inputMode="url"
              placeholder="https://open.spotify.com/…"
              autoCapitalize="none"
              value={values.spotify}
              onChange={(e) => set("spotify", e.target.value)}
              aria-invalid={Boolean(spotifyError)}
              className="input"
            />
            <FieldError message={spotifyError} />
          </div>
        </div>

        <div>
          <label htmlFor="notes" className="label">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            value={values.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="input"
            placeholder="e.g. Start soft, build on the bridge."
          />
        </div>
      </section>

      {/* Editor + live preview: side by side on wide screens, stacked on phones. */}
      <section className="grid gap-4 md:grid-cols-2">
        <div className="card flex flex-col">
          <div className="mb-1 flex items-center justify-between gap-2">
            <label htmlFor="chordText" className="text-sm font-medium text-stone-700">
              Chords &amp; lyrics
            </label>
            <button
              type="button"
              onClick={() => set("chordText", convertToChordPro(values.chordText))}
              className="text-sm font-medium text-accent-700 hover:underline"
            >
              Convert to ChordPro
            </button>
          </div>
          {/* wrap="off": pasted chord sheets line up chords by column, so long
              lines must scroll sideways instead of wrapping and breaking that. */}
          <textarea
            id="chordText"
            name="chordText"
            wrap="off"
            spellCheck={false}
            autoCapitalize="none"
            autoCorrect="off"
            value={values.chordText}
            onChange={(e) => set("chordText", e.target.value)}
            className="input min-h-[45dvh] flex-1 resize-y overflow-x-auto whitespace-pre font-mono text-sm leading-relaxed md:min-h-[60dvh]"
            placeholder={"Paste a chord sheet:\n\nG        C\nAmazing grace\n\n…or type ChordPro:\n\n[G]Amazing [C]grace"}
          />
          <p className="mt-2 text-xs text-stone-500">
            Paste chords-above-lyrics or type <code>[G]inline</code> chords. Either way it&apos;s saved as
            ChordPro.
          </p>
        </div>

        <div className="card">
          <h2 className="label">Preview</h2>
          <div className="overflow-x-auto">
            <ChordSheet lines={previewLines} />
          </div>
        </div>
      </section>

      <section className="card">
        <label htmlFor="editNote" className="label">
          {isEdit ? "What did you change? (optional)" : "Note for the history (optional)"}
        </label>
        <input
          id="editNote"
          name="editNote"
          maxLength={500}
          value={editNote}
          onChange={(e) => setEditNote(e.target.value)}
          className="input"
          placeholder={isEdit ? "e.g. Fixed the bridge chords" : "e.g. Chords from our Sunday recording"}
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button type="submit" disabled={pending} className="btn-primary sm:min-w-40">
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add song"}
        </button>
      </div>
    </form>
  );
}
