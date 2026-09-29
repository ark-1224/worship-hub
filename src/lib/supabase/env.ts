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
  return { url, key };
}
