// Reads the two public Supabase settings and fails with a readable message
// (instead of a cryptic crash) if .env.local hasn't been filled in yet.
// The values come from .env.local locally and from Project Settings on Vercel.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase settings. Copy .env.local.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see README).",
    );
  }
  // The dashboard also shows the "Data API" address (.../rest/v1/). Only the
  // base project URL is wanted, so drop any path someone pasted by mistake.
  try {
    return { url: new URL(url).origin, key };
  } catch {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL isn't a valid URL. It should look like https://xxxx.supabase.co");
  }
}
