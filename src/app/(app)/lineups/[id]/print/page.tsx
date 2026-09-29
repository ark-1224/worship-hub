import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintToolbar } from "@/components/PrintToolbar";
import { ChordSheet } from "@/components/songs/ChordSheet";
import { prepareChart } from "@/lib/chords/chart";
import { formatServiceDate, formatServiceTime } from "@/lib/lineups";
import { isUuid } from "@/lib/songs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Print lineup" };

type ItemRow = {
  id: string;
  key_override: string | null;
  note: string | null;
  leader: { name: string } | null;
  song: { title: string; artist: string | null; original_key: string | null; chord_text: string | null } | null;
};

// A printable lineup: the songs in order with their key, leader and note, and
// (if asked) each song's full chord chart on its own page, in the key chosen
// for this service. Printing uses the browser's print dialog, so it also
// offers "Save as PDF".
//   ?charts=1  include the chord charts      ?chords=0  words only in the charts
export default async function PrintLineupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ charts?: string; chords?: string }>;
}) {
  const { id } = await params;
  const { charts, chords } = await searchParams;
  if (!isUuid(id)) notFound();
  const includeCharts = charts === "1";
  const showChords = chords !== "0";

  const supabase = await createClient();
  const { data: lineup } = await supabase
    .from("lineups")
    .select(
      "id, title, service_date, service_time, service_type, notes, lineup_items(id, position, key_override, note, leader:profiles(name), song:songs(title, artist, original_key, chord_text))",
    )
    .eq("id", id)
    .order("position", { referencedTable: "lineup_items" })
    .maybeSingle();
  if (!lineup) notFound();

  const items = ((lineup.lineup_items ?? []) as unknown as ItemRow[]).filter((row) => row.song);
  const when = [formatServiceDate(lineup.service_date), formatServiceTime(lineup.service_time)]
    .filter(Boolean)
    .join(" · ");

  const link = (extra: string) => `/lineups/${id}/print${extra}`;

  return (
    <div className="space-y-6">
      <PrintToolbar
        backHref={`/lineups/${id}`}
        backLabel="Back to the lineup"
        options={[
          { href: link(""), label: "Song list only", active: !includeCharts },
          { href: link("?charts=1"), label: "With chord charts", active: includeCharts && showChords },
          { href: link("?charts=1&chords=0"), label: "With lyrics only", active: includeCharts && !showChords },
        ]}
      />

      <article className="space-y-5 text-black">
        <header className="space-y-1 border-b border-stone-300 pb-3">
          <h1 className="text-3xl font-bold">{lineup.title}</h1>
          <p className="text-lg">
            {when}
            {lineup.service_type ? ` · ${lineup.service_type}` : ""}
          </p>
          {lineup.notes && <p className="whitespace-pre-line text-stone-700">{lineup.notes}</p>}
        </header>

        {items.length === 0 ? (
          <p>This lineup has no songs yet.</p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, i) => {
              const chart = prepareChart(item.song!.chord_text ?? "", item.song!.original_key, item.key_override);
              return (
                <li key={item.id} className="flex gap-3 print:break-inside-avoid">
                  <span className="w-7 shrink-0 text-right text-xl font-bold">{i + 1}.</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl font-semibold">
                      {item.song!.title}
                      {chart.shownKey && <span className="ml-3 rounded border border-black px-2 text-base">Key {chart.shownKey}</span>}
                    </p>
                    <p className="text-stone-700">
                      {[
                        item.song!.artist,
                        item.leader?.name && `Lead: ${item.leader.name}`,
                        item.key_override && item.song!.original_key && item.key_override !== item.song!.original_key
                          ? `original key ${item.song!.original_key}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {item.note && <p className="italic">{item.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {includeCharts &&
          items.map((item, i) => {
            const chart = prepareChart(item.song!.chord_text ?? "", item.song!.original_key, item.key_override);
            return (
              <section
                key={`chart-${item.id}`}
                className="space-y-3 border-t border-stone-300 pt-5 print:break-before-page print:border-0 print:pt-0"
              >
                <h2 className="text-2xl font-bold">
                  {i + 1}. {item.song!.title}
                  {chart.shownKey && <span className="ml-3 text-lg font-semibold">Key {chart.shownKey}</span>}
                </h2>
                {item.note && <p className="italic">{item.note}</p>}
                <ChordSheet
                  lines={chart.lines}
                  transposeChord={chart.transpose}
                  fontSizePx={15}
                  showChords={showChords}
                  variant="print"
                />
              </section>
            );
          })}
      </article>
    </div>
  );
}
