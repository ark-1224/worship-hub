import { tokenizeLine, type SongLine } from "@/lib/chords/chordpro";

// Draws parsed ChordPro: each chord sits directly above the lyric text it
// belongs to. A "word" is drawn as one unbreakable inline block, and spaces
// between words are ordinary text, so on a narrow phone the line wraps
// between words and never splits a chord from its syllable.
//
// `transposeChord` is optional; the song page passes one to show another key.

export function ChordSheet({
  lines,
  transposeChord,
  className = "",
}: {
  lines: SongLine[];
  transposeChord?: (chord: string) => string;
  className?: string;
}) {
  if (lines.every((l) => l.kind === "blank")) {
    return <p className="text-stone-500">Nothing to show yet.</p>;
  }

  return (
    <div className={`font-mono text-[15px] leading-tight sm:text-base ${className}`}>
      {lines.map((line, i) => {
        if (line.kind === "blank") return <div key={i} className="h-4" aria-hidden />;

        if (line.kind === "comment") {
          return (
            <div key={i} className="mt-3 mb-1 font-sans text-sm font-bold uppercase tracking-wide text-accent-700">
              {line.text}
            </div>
          );
        }

        // Lines with no chords at all don't need the empty chord row above them.
        const hasChords = line.segments.some((s) => s.chord !== null);
        const tokens = tokenizeLine(line.segments);

        return (
          <div key={i} className={hasChords ? "pt-1" : ""}>
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
                        <span className="min-h-[1.25em] pr-1 font-bold text-accent-700">
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
