import type { Metadata } from "next";
import { SongForm } from "@/components/songs/SongForm";
import { emptySongValues } from "@/lib/songs";

export const metadata: Metadata = { title: "Add song" };

export default function NewSongPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Add song</h1>
      <SongForm initial={emptySongValues} />
    </div>
  );
}
