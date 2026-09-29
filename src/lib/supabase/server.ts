import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Supabase client for Server Components, Server Actions and Route Handlers.
// It reads the login session from the request cookies, so every query runs
// "as" the logged-in member and Row Level Security applies.
// Create a fresh client per request; never share one between requests.
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = getSupabaseEnv();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components can't set cookies. That's fine: proxy.ts already
          // refreshes the session on every request.
        }
      },
    },
  });
}
