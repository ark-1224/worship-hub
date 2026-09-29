// Decides whether a piece of text is a chord symbol like "G", "Bbmaj7" or "D/F#".
//
// This is deliberately STRICT. When we look at a pasted chord sheet we must not
// mistake ordinary lyric words for chords ("Amen", "Bad", "Dad" all start with a
// chord letter). So the whole word has to be: a root note (A-G, optional #/b),
// then only known chord-quality pieces, then an optional slash bass note.

const CHORD_PATTERN =
  /^[A-G][#b]?(?:maj|min|dim|aug|sus|add|omit|alt|[mM+\-°øΔ]|\d|[#b]|[(),])*(?:\/[A-G][#b]?)?$/;

export function isChordSymbol(token: string): boolean {
  return CHORD_PATTERN.test(token);
}

// "No chord" markers that sit in chord positions on some sheets.
const NO_CHORD_PATTERN = /^n\.?c\.?$/i;

export function isNoChordMarker(token: string): boolean {
  return NO_CHORD_PATTERN.test(token);
}
