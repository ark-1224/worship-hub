import { describe, expect, it } from "vitest";
import { prepareChart } from "./chart";

const text = "[G]Amazing [C]grace, how [D/F#]sweet\n[Em]the [Bb]sound";

const shown = (chart: ReturnType<typeof prepareChart>) =>
  chart.lines.flatMap((l) => (l.kind === "lyrics" ? l.segments.map((s) => s.chord).filter(Boolean) : [])).map((c) => chart.transpose(c!));

describe("prepareChart", () => {
  it("shows the chords as saved when no key is asked for", () => {
    const chart = prepareChart(text, "G", null);
    expect(shown(chart)).toEqual(["G", "C", "D/F#", "Em", "Bb"]);
    expect(chart.shownKey).toBe("G");
    expect(chart.savedKey).toBe("G");
  });

  it("moves every chord to the asked-for key", () => {
    const chart = prepareChart(text, "G", "A");
    expect(shown(chart)).toEqual(["A", "D", "E/G#", "F#m", "C"]);
    expect(chart.shownKey).toBe("A");
  });

  it("spells with flats in a flat key and sharps in a sharp key", () => {
    expect(shown(prepareChart(text, "G", "F"))).toEqual(["F", "Bb", "C/E", "Dm", "Ab"]);
    expect(shown(prepareChart(text, "G", "Ab")).slice(0, 2)).toEqual(["Ab", "Db"]);
    expect(shown(prepareChart(text, "G", "D"))[4]).toBe("F"); // Bb up 7 = F
  });

  it("keeps a forced sharp key spelled with sharps (A# prints sharps)", () => {
    const chart = prepareChart("[G]x [C]y", "G", "A#");
    expect(shown(chart)).toEqual(["A#", "D#"]);
  });

  it("guesses the saved key from the first chord when the song has none", () => {
    const chart = prepareChart("[Am]la [F]la", null, "Bm");
    expect(chart.savedKey).toBe("Am");
    expect(shown(chart)).toEqual(["Bm", "G"]);
  });

  it("ignores an unreadable target key", () => {
    expect(shown(prepareChart(text, "G", "nonsense"))).toEqual(["G", "C", "D/F#", "Em", "Bb"]);
  });

  it("copes with a song that has no chords or key", () => {
    const chart = prepareChart("just words", null, "A");
    expect(chart.shownKey).toBeNull();
    expect(chart.savedKey).toBeNull();
    expect(chart.lines).toHaveLength(1);
  });
});
