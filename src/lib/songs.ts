import { convertToChordPro } from "./chords/chordsOverWords";
import { KEY_PATTERN } from "./chords/keys";
import { parseSpotifyInput, parseYouTubeInput } from "./links";

// What the song form submits, after checking and cleaning.
export type SongInput = {
  id: string | null; // null = new song
  title: string;
  artist: string;
  originalKey: string;
  bpm: number | null;
  tags: string[];
  youtubeVideoId: string | null;
  spotifyUrl: string | null;
  notes: string;
  chordText: string; // always ChordPro
  editNote: string;
};

// The song form's fields as plain text (before checking). Lives here rather than
// in the "use client" form file so server pages can import the empty starting values.
export type SongFormValues = {
  id: string | null;
  title: string;
  artist: string;
  originalKey: string;
  bpm: string;
  tags: string;
  youtube: string; // a full link; the ID is extracted when saving
  spotify: string;
  notes: string;
  chordText: string;
};

export const emptySongValues: SongFormValues = {
  id: null,
  title: "",
  artist: "",
  originalKey: "",
  bpm: "",
  tags: "",
  youtube: "",
  spotify: "",
  notes: "",
  chordText: "",
};

export type SongFieldName = "title" | "originalKey" | "bpm" | "youtube" | "spotify" | "tags";
export type SongFieldErrors = Partial<Record<SongFieldName, string>>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

/** "worship, Slow ,  praise" -> ["worship", "Slow", "praise"] (no blanks, no duplicates). */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(",")) {
    const tag = part.trim().replace(/\s+/g, " ");
    const key = tag.toLowerCase();
    if (tag && !seen.has(key)) {
      seen.add(key);
      tags.push(tag);
    }
  }
  return tags;
}

const field = (formData: FormData, name: string) => String(formData.get(name) ?? "");

/**
 * Checks everything the song form sends. Runs on the server (the real check);
 * the form only repeats the YouTube check for instant feedback.
 */
export function parseSongForm(
  formData: FormData,
): { ok: true; value: SongInput } | { ok: false; errors: SongFieldErrors } {
  const errors: SongFieldErrors = {};

  const title = field(formData, "title").trim();
  if (!title) errors.title = "Enter the song title.";
  else if (title.length > 200) errors.title = "Title is too long (200 characters max).";

  const originalKey = field(formData, "originalKey").trim();
  if (originalKey && !KEY_PATTERN.test(originalKey)) errors.originalKey = "Pick a key from the list.";

  const bpmRaw = field(formData, "bpm").trim();
  let bpm: number | null = null;
  if (bpmRaw) {
    bpm = Number(bpmRaw);
    if (!Number.isInteger(bpm) || bpm < 20 || bpm > 300) {
      errors.bpm = "BPM must be a whole number between 20 and 300.";
      bpm = null;
    }
  }

  const tags = parseTags(field(formData, "tags"));
  if (tags.length > 20 || tags.some((t) => t.length > 40)) {
    errors.tags = "Use up to 20 tags, each 40 characters or fewer.";
  }

  const youtube = parseYouTubeInput(field(formData, "youtube"));
  if (!youtube.ok) errors.youtube = youtube.error;

  const spotify = parseSpotifyInput(field(formData, "spotify"));
  if (!spotify.ok) errors.spotify = spotify.error;

  if (Object.keys(errors).length > 0 || !youtube.ok || !spotify.ok) return { ok: false, errors };

  const id = field(formData, "id").trim();

  return {
    ok: true,
    value: {
      id: isUuid(id) ? id : null,
      title,
      artist: field(formData, "artist").trim(),
      originalKey,
      bpm,
      tags,
      youtubeVideoId: youtube.value,
      spotifyUrl: spotify.value,
      notes: field(formData, "notes").trim(),
      // Whatever style was pasted, ChordPro is what gets stored.
      chordText: convertToChordPro(field(formData, "chordText")).trimEnd(),
      editNote: field(formData, "editNote").trim(),
    },
  };
}
