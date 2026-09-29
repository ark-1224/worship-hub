// Shows what differs between two versions of a song. Written by hand (a few
// dozen lines) so the project needs no extra library.

export type DiffLine = { type: "same" | "added" | "removed"; text: string };

// The comparison table has (lines x lines) cells. Beyond this size we skip the
// clever comparison and just show "all old lines removed, all new lines added".
const MAX_CELLS = 2_000_000;

/**
 * Line-by-line comparison. Read it as "going from `from` to `to`":
 *   removed = in `from` only,  added = in `to` only,  same = in both.
 * (Uses the longest-common-subsequence method, the same idea behind `git diff`.)
 */
export function diffLines(from: string, to: string): DiffLine[] {
  const a = from.replace(/\r\n?/g, "\n").split("\n");
  const b = to.replace(/\r\n?/g, "\n").split("\n");

  // Lines that match at the very start and end are "same"; only compare the middle.
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);

  const result: DiffLine[] = a.slice(0, start).map((text) => ({ type: "same", text }));
  result.push(...diffMiddle(midA, midB));
  result.push(...a.slice(endA).map((text): DiffLine => ({ type: "same", text })));
  return result;
}

function diffMiddle(a: string[], b: string[]): DiffLine[] {
  const n = a.length;
  const m = b.length;
  if (n === 0) return b.map((text) => ({ type: "added", text }));
  if (m === 0) return a.map((text) => ({ type: "removed", text }));
  if (n * m > MAX_CELLS) {
    return [
      ...a.map((text): DiffLine => ({ type: "removed", text })),
      ...b.map((text): DiffLine => ({ type: "added", text })),
    ];
  }

  // lcs[i][j] = how many lines a[i..] and b[j..] have in common, in order.
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  // Walk the table from the top-left corner, emitting one line at a time.
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      out.push({ type: "same", text: a[i] });
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      out.push({ type: "removed", text: a[i++] });
    } else {
      out.push({ type: "added", text: b[j++] });
    }
  }
  while (i < n) out.push({ type: "removed", text: a[i++] });
  while (j < m) out.push({ type: "added", text: b[j++] });
  return out;
}

/** True if the two texts have any line that differs. */
export function hasChanges(lines: DiffLine[]): boolean {
  return lines.some((l) => l.type !== "same");
}

// ---------------------------------------------------------------------------
// The other fields (title, key, BPM ...)
// ---------------------------------------------------------------------------

export type SongDetails = {
  title: string;
  artist: string | null;
  originalKey: string | null;
  bpm: number | null;
  tags: string[];
  youtubeVideoId: string | null;
  spotifyUrl: string | null;
  notes: string | null;
};

export type FieldChange = { label: string; from: string; to: string };

const show = (value: string | number | null | undefined) =>
  value === null || value === undefined || value === "" ? "(none)" : String(value);

/**
 * Which details differ. Read as "going from `from` to `to`", the same
 * direction as diffLines.
 */
export function diffDetails(from: SongDetails, to: SongDetails): FieldChange[] {
  const rows: [string, string, string][] = [
    ["Title", show(from.title), show(to.title)],
    ["Artist", show(from.artist), show(to.artist)],
    ["Key", show(from.originalKey), show(to.originalKey)],
    ["BPM", show(from.bpm), show(to.bpm)],
    ["Tags", show(from.tags.join(", ")), show(to.tags.join(", "))],
    ["YouTube", show(from.youtubeVideoId), show(to.youtubeVideoId)],
    ["Spotify", show(from.spotifyUrl), show(to.spotifyUrl)],
    ["Notes", show(from.notes), show(to.notes)],
  ];
  return rows.filter(([, f, t]) => f !== t).map(([label, f, t]) => ({ label, from: f, to: t }));
}
