import type { Metadata } from "next";
import { LineupForm } from "@/components/lineups/LineupForm";
import { emptyLineupValues } from "@/lib/lineups";

export const metadata: Metadata = { title: "New lineup" };

export default function NewLineupPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">New lineup</h1>
      <p className="text-stone-600">Start with the details. You&apos;ll add the songs on the next screen.</p>
      <LineupForm initial={emptyLineupValues} />
    </div>
  );
}
