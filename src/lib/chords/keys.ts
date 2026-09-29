// Keys a song can be saved in (the "original key" dropdown on the song form).
// Stored as plain text like "G", "Bb" or "Am"; the database only accepts this
// same shape (see the check constraint in 0001_schema.sql).

export const MAJOR_KEYS = [
  "C", "C#", "Db", "D", "Eb", "E", "F", "F#", "Gb", "G", "Ab", "A", "Bb", "B",
] as const;

export const MINOR_KEYS = [
  "Cm", "C#m", "Dm", "Ebm", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "Bbm", "Bm",
] as const;

export const SONG_KEYS: readonly string[] = [...MAJOR_KEYS, ...MINOR_KEYS];

export const KEY_PATTERN = /^[A-G][#b]?m?$/;
