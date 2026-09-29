import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components (runs in the browser). Used for
// Realtime: hearing about lineup changes made by other people.
// NEXT_PUBLIC_* values must be referenced literally so Next can inline them.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
