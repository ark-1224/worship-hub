import { tokenizeLine, type SongLine } from "@/lib/chords/chordpro";

// Draws parsed ChordPro: each chord sits directly above the lyric text it
// belongs to. A "word" is drawn as one unbreakable inline block, and spaces
// between words are ordinary text, so on a narrow phone the line wraps
// between words and never splits a chord from its syllable.
//
// Optional settings (the song page and stage mode use them):
//   transposeChord  show another key
//   fontSizePx      text size; everything else scales from it
//   showChords      false = lyrics only, for singers
//   variant         "dark" for stage mode (light text on black)

export function ChordSheet({
  lines,
  transposeChord,
  fontSizePx,
  showChords = true,
  variant = "light",
  className = "",
}: {
  lines: SongLine[];
  transposeChord?: (chord: string) => string;
  fontSizePx?: number;
  showChords?: boolean;
  variant?: "light" | "dark" | "print";
  className?: string;
}) {
  const dark = variant === "dark";
  // Chords and section headings: amber on black for stage, plain black on paper, brand colour otherwise.
  const accent = dark ? "text-amber-300" : variant === "print" ? "text-black" : "text-accent-700";

  if (lines.every((l) => l.kind === "blank")) {
    return <p className={dark ? "text-stone-400" : "text-stone-500"}>Nothing to show yet.</p>;
  }

  return (
    <div
      className={`font-mono leading-tight ${fontSizePx ? "" : "text-[15px] sm:text-base"} ${className}`}
      style={fontSizePx ? { fontSize: fontSizePx } : undefined}
    >
      {lines.map((line, i) => {
        if (line.kind === "blank") return <div key={i} className="h-[1em]" aria-hidden />;

        if (line.kind === "comment") {
          return (
            <div
              key={i}
              className={`mt-3 mb-1 font-sans text-[0.8em] font-bold uppercase tracking-wide ${accent}`}
            >
              {line.text}
            </div>
          );
        }

        // Lyrics only: a line that is just chords (an intro like "[Am] [G]") has nothing to sing.
        if (!showChords && line.segments.every((s) => s.text.trim() === "")) return null;

        // Lines with no chords at all don't need the empty chord row above them.
        const hasChords = showChords && line.segments.some((s) => s.chord !== null);
        const tokens = tokenizeLine(line.segments);

        return (
          // print:break-inside-avoid keeps a chord line and its lyric together across pages.
          <div key={i} className={`print:break-inside-avoid ${hasChords ? "pt-[0.25em]" : ""}`}>
            {tokens.map((token, j) =>
              token.type === "space" ? (
                <span key={j} className="whitespace-pre-wrap">
                  {token.text}
                </span>
              ) : (
                <span key={j} className="inline-flex whitespace-nowrap align-bottom">
                  {token.parts.map((part, k) => (
                    <span key={k} className="inline-flex flex-col">
                      {hasChords && (
                        <span className={`min-h-[1.25em] pr-[0.25em] font-bold ${accent}`}>
                          {part.chord === null
                            ? " "
                            : transposeChord
                              ? transposeChord(part.chord)
                              : part.chord}
                        </span>
                      )}
                      <span className="whitespace-pre">{part.text}</span>
                    </span>
                  ))}
                </span>
              ),
            )}
          </div>
        );
      })}
    </div>
  );
}
