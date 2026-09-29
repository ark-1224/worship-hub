// Reads ChordPro text into a simple structure the screen can draw.
//
//   "[G]Amazing [C]grace"  ->  segments: { chord: "G", text: "Amazing " }, { chord: "C", text: "grace" }
//
// This is intentionally forgiving: the live preview re-reads the text on every
// keystroke, including half-typed input like "[G]Amazing [C" — that must never
// throw, so unfinished brackets are simply shown as plain text.

/** A chord (may be null) and the lyric text that follows it, up to the next chord. */
export type Segment = { chord: string | null; text: string };

export type SongLine =
  | { kind: "blank" }
  | { kind: "comment"; text: string } // section labels: {comment: Verse 1}
  | { kind: "lyrics"; segments: Segment[] };

// {comment: Verse 1}, {c: Chorus}, {start_of_chorus: Chorus} ...
const DIRECTIVE = /^\{\s*([A-Za-z_]+)\s*(?::\s*(.*?))?\s*\}$/;
const COMMENT_DIRECTIVES = new Set(["comment", "c", "comment_italic", "ci", "comment_box", "cb"]);
// Section starts show their label (or a default name) as a heading.
const SECTION_DEFAULTS: Record<string, string> = {
  start_of_verse: "Verse",
  sov: "Verse",
  start_of_chorus: "Chorus",
  soc: "Chorus",
  start_of_bridge: "Bridge",
  sob: "Bridge",
};

export function parseChordProLine(line: string): SongLine {
  const trimmed = line.trim();
  if (trimmed === "") return { kind: "blank" };

  const directive = DIRECTIVE.exec(trimmed);
  if (directive) {
    const name = directive[1].toLowerCase();
    const value = directive[2]?.trim() ?? "";
    if (COMMENT_DIRECTIVES.has(name) && value) return { kind: "comment", text: value };
    if (name in SECTION_DEFAULTS) return { kind: "comment", text: value || SECTION_DEFAULTS[name] };
    // Other directives ({title}, {key}, {end_of_chorus}...) aren't drawn.
    return { kind: "blank" };
  }

  return { kind: "lyrics", segments: parseSegments(trimmed) };
}

function parseSegments(line: string): Segment[] {
  const segments: Segment[] = [];
  let chord: string | null = null;
  let last = 0;

  const push = (text: string) => {
    if (chord !== null || text !== "") segments.push({ chord, text });
  };

  // Only a bracket pair on this line counts as a chord; a lone "[" stays text.
  for (const m of line.matchAll(/\[([^\][]*)\]/g)) {
    push(line.slice(last, m.index));
    const name = m[1].trim();
    chord = name === "" ? null : name; // "[]" is ignored
    last = m.index + m[0].length;
  }
  push(line.slice(last));
  return segments;
}

export function parseChordPro(text: string): SongLine[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("#")) // "# note to self" lines
    .map(parseChordProLine);
}

// ---------------------------------------------------------------------------
// Line wrapping helper
// ---------------------------------------------------------------------------
// On a phone a long line must wrap, but a chord in the middle of a word
// ("gra[C]ce") must never be split from that word. So we regroup segments
// into WORDS (runs without spaces) and SPACES; the screen lets the browser
// break lines only at the spaces.

export type WordPart = { chord: string | null; text: string };
export type LineToken =
  | { type: "word"; parts: WordPart[] }
  | { type: "space"; text: string };

export function tokenizeLine(segments: Segment[]): LineToken[] {
  const tokens: LineToken[] = [];
  let currentWord: WordPart[] | null = null;

  const addToWord = (part: WordPart) => {
    if (!currentWord) {
      currentWord = [];
      tokens.push({ type: "word", parts: currentWord });
    }
    currentWord.push(part);
  };

  for (const { chord, text } of segments) {
    // "grace, how " -> ["grace,", " ", "how", " "]  (spaces kept as their own pieces)
    const pieces = text.split(/(\s+)/).filter((p) => p !== "");
    if (pieces.length === 0) {
      addToWord({ chord, text: "" }); // a chord with no lyric under it
      continue;
    }
    let pendingChord = chord;
    for (const piece of pieces) {
      if (/^\s+$/.test(piece)) {
        // A chord that sits right before a space stays with the word it ends.
        if (pendingChord !== null) {
          addToWord({ chord: pendingChord, text: "" });
          pendingChord = null;
        }
        currentWord = null;
        tokens.push({ type: "space", text: piece });
      } else {
        addToWord({ chord: pendingChord, text: piece });
        pendingChord = null;
      }
    }
  }
  return tokens;
}
