import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  // Row Level Security lets a member read profiles, so this is just their name.
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", claims?.claims.sub ?? "")
    .maybeSingle();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Hi{profile?.name ? `, ${profile.name}` : ""} 👋</h1>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/songs" className="card block hover:border-accent-600">
          <span className="text-lg font-semibold">Song library</span>
          <span className="mt-1 block text-stone-600">Find a song, view chords, transpose.</span>
        </Link>
        <Link href="/songs/new" className="card block hover:border-accent-600">
          <span className="text-lg font-semibold">Add song</span>
          <span className="mt-1 block text-stone-600">Paste a chord sheet or type ChordPro.</span>
        </Link>
      </div>
    </div>
  );
}
