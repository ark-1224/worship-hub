import { isChordSymbol, isNoChordMarker } from "./chordSymbol";

// Converts text pasted from a chord sheet into ChordPro, the one format we store.
//
//   chords above lyrics              ChordPro
//   ------------------------         ---------------------------
//   G        C                       [G]Amazing [C]grace
//   Amazing  grace
//
// How: a "chord line" is followed by its lyric line. We measure the column
// where each chord starts and insert "[chord]" into the lyric at that same
// column (so the chord lands over the same letter).
//
// Text that is already ChordPro is left alone, so running this on ChordPro is
// safe, and mixed text works line by line.

const TAB_SIZE = 4;

// Words that start a section heading ("Verse 1", "[Chorus]", "Bridge x2").
const SECTION_WORDS =
  "intro|verse|chorus|pre[- ]?chorus|bridge|tag|outro|instrumental|interlude|refrain|ending|turnaround|vamp|coda|hook|solo|channel|stanza";

// "[Verse 1]" / "[Chorus x2]": any bracket-only line that isn't a chord.
const BRACKET_HEADING = /^\s*\[([^\]]+)\]\s*:?\s*$/;
// "Verse 1", "Chorus:", "Bridge (x2)"; the rest of the line must look like a label, not lyrics.
const WORD_HEADING = new RegExp(
  `^\\s*((?:${SECTION_WORDS})\\s*\\d*\\s*(?:\\(.*\\)|x\\d+)?)\\s*:?\\s*$`,
  "i",
);
// "Intro: G C D"  ->  heading + a line of chords on the same row
const HEADING_WITH_CHORDS = new RegExp(`^\\s*((?:${SECTION_WORDS})\\s*\\d*)\\s*:\\s*(\\S.*)$`, "i");

// Things that can sit on a chord line besides chords: bar lines, dashes, repeat marks.
const FILLER = /^(?:\|+|[-–—/\\:~%*.]+|x\d+|\(x\d+\)|\d+x|\(\d+x\))$/i;
const REPEAT_MARK = /^(?:x\d+|\(x\d+\)|\d+x|\(\d+x\))$/i;

type ChordToken = { text: string; column: number };

function expandTabs(line: string): string {
  let out = "";
  for (const ch of line) {
    out += ch === "\t" ? " ".repeat(TAB_SIZE - (out.length % TAB_SIZE)) : ch;
  }
  return out;
}

// Splits a line into whitespace-separated tokens, remembering each one's column.
// "|" is turned into a space first (same length, so columns don't move).
function tokenize(line: string): ChordToken[] {
  const tokens: ChordToken[] = [];
  for (const m of line.replace(/\|/g, " ").matchAll(/\S+/g)) {
    tokens.push({ text: m[0], column: m.index });
  }
  return tokens;
}

function isChordish(token: string): boolean {
  return isChordSymbol(token) || isNoChordMarker(token);
}

/** True if the line is only chords (plus bars/repeat marks), with at least one real chord. */
function isChordLine(line: string): boolean {
  const tokens = tokenize(line);
  if (tokens.length === 0) return false;
  let realChords = 0;
  for (const { text } of tokens) {
    if (isChordSymbol(text)) realChords++;
    else if (!isNoChordMarker(text) && !FILLER.test(text)) return false;
  }
  return realChords > 0;
}

/** Already-ChordPro lines: {directives}, # comments, or lines with inline [Chord]s. */
function isChordProLine(line: string): boolean {
  const t = line.trim();
  if (t.startsWith("{") && t.endsWith("}")) return true;
  if (t.startsWith("#")) return true;
  for (const m of t.matchAll(/\[([^\]]+)\]/g)) {
    if (isChordish(m[1].trim())) return true;
  }
  return false;
}

/** Returns the heading text if the line is a section heading like "Verse 1" or "[Chorus]". */
function sectionHeading(line: string): string | null {
  const bracket = BRACKET_HEADING.exec(line);
  if (bracket && !isChordish(bracket[1].trim())) return bracket[1].trim();
  const word = WORD_HEADING.exec(line);
  return word ? word[1].trim() : null;
}

function isLyricLine(line: string | undefined): line is string {
  if (line === undefined || line.trim() === "") return false;
  return !isChordLine(line) && !isChordProLine(line) && sectionHeading(line) === null;
}

// Where in the lyric a chord goes. A chord sitting over a gap between words
// belongs to the next word; past the end of the lyric it goes at the end.
function insertionIndex(lyric: string, column: number): number {
  let i = Math.min(column, lyric.length);
  while (i < lyric.length && lyric[i] === " ") i++;
  return i;
}

function mergeChordsIntoLyric(chordLine: string, lyricLine: string): string {
  const lyric = lyricLine.trimEnd();
  const chords = tokenize(chordLine).filter((t) => isChordish(t.text));

  // Insert from the rightmost chord to the leftmost, so earlier insertions
  // don't shift the positions of the ones still to come.
  let result = lyric;
  for (const chord of [...chords].reverse()) {
    const at = insertionIndex(lyric, chord.column);
    // `at` is measured in the ORIGINAL lyric; that's still right because
    // everything inserted so far sits at or after `at`.
    result = result.slice(0, at) + `[${chord.text}]` + result.slice(at);
  }
  return result.trimStart();
}

// A chord line with no lyric under it (intro, instrumental): "[Am] [G] [C]".
function chordsOnly(line: string): string {
  return tokenize(line)
    .flatMap(({ text }) => {
      if (isChordish(text)) return [`[${text}]`];
      return REPEAT_MARK.test(text) ? [text] : []; // keep "x2", drop bars and dashes
    })
    .join(" ");
}

export function convertToChordPro(input: string): string {
  const lines = input.replace(/\r\n?/g, "\n").split("\n").map(expandTabs);
  const out: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === "") {
      out.push("");
      continue;
    }
    if (isChordProLine(line)) {
      out.push(line.trimEnd());
      continue;
    }

    const withChords = HEADING_WITH_CHORDS.exec(line);
    if (withChords && isChordLine(withChords[2])) {
      out.push(`{comment: ${withChords[1].trim()}}`, chordsOnly(withChords[2]));
      continue;
    }

    const heading = sectionHeading(line);
    if (heading !== null) {
      out.push(`{comment: ${heading}}`);
      continue;
    }

    if (isChordLine(line)) {
      const next = lines[i + 1];
      if (isLyricLine(next)) {
        out.push(mergeChordsIntoLyric(line, next));
        i++; // the lyric line is consumed
      } else {
        out.push(chordsOnly(line));
      }
      continue;
    }

    out.push(line.trim());
  }

  return out.join("\n");
}
