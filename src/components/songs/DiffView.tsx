import type { DiffLine, FieldChange } from "@/lib/diff";

// Shows a comparison: changed details as a small table, then the chords and
// lyrics line by line. Colours are backed by +/− marks so they don't rely on
// colour alone. Long unchanged stretches are folded to keep the page short.

const CONTEXT = 2; // unchanged lines kept around each change

type Row = DiffLine | { type: "gap"; count: number };

function foldUnchanged(lines: DiffLine[]): Row[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.type === "same") return;
    for (let j = Math.max(0, i - CONTEXT); j <= Math.min(lines.length - 1, i + CONTEXT); j++) keep[j] = true;
  });

  const rows: Row[] = [];
  let skipped = 0;
  lines.forEach((line, i) => {
    if (keep[i]) {
      if (skipped > 0) rows.push({ type: "gap", count: skipped });
      skipped = 0;
      rows.push(line);
    } else {
      skipped++;
    }
  });
  if (skipped > 0) rows.push({ type: "gap", count: skipped });
  return rows;
}

export function DiffView({ lines, fields }: { lines: DiffLine[]; fields: FieldChange[] }) {
  const changed = lines.some((l) => l.type !== "same");
  const rows = foldUnchanged(lines);

  return (
    <div className="space-y-4">
      {fields.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-3 py-2 font-medium">Detail</th>
                <th className="px-3 py-2 font-medium">Now</th>
                <th className="px-3 py-2 font-medium">After restoring</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {fields.map((f) => (
                <tr key={f.label}>
                  <th className="px-3 py-2 font-medium">{f.label}</th>
                  <td className="px-3 py-2 break-words text-red-800">{f.from}</td>
                  <td className="px-3 py-2 break-words text-emerald-800">{f.to}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {changed ? (
        <div
          className="overflow-x-auto rounded-lg border border-stone-200 font-mono text-sm"
          role="group"
          aria-label="Changes to the chords and lyrics"
        >
          {rows.map((row, i) => {
            if (row.type === "gap") {
              return (
                <div key={i} className="bg-stone-50 px-3 py-1 text-xs text-stone-400">
                  … {row.count} unchanged {row.count === 1 ? "line" : "lines"}
                </div>
              );
            }
            const style =
              row.type === "added"
                ? "bg-emerald-50 text-emerald-900"
                : row.type === "removed"
                  ? "bg-red-50 text-red-900"
                  : "text-stone-500";
            const mark = row.type === "added" ? "+" : row.type === "removed" ? "−" : " ";
            return (
              <div key={i} className={`flex gap-2 px-3 py-0.5 whitespace-pre ${style}`}>
                <span aria-hidden className="w-3 shrink-0 select-none">
                  {mark}
                </span>
                <span>
                  {row.type === "added" && <span className="sr-only">Added: </span>}
                  {row.type === "removed" && <span className="sr-only">Removed: </span>}
                  {row.text || " "}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-stone-600">The chords and lyrics are the same as they are now.</p>
      )}
    </div>
  );
}
