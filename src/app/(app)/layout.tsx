import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

// Every page inside the (app) folder needs a logged-in member.
// proxy.ts already redirects logged-out visitors; checking again here means a
// page is still protected even if the proxy were misconfigured.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2">
          <Link href="/" className="text-lg font-bold text-accent-700">
            Worship Hub
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm font-medium sm:gap-2">
            <Link href="/songs" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Library
            </Link>
            <Link href="/songs/new" className="rounded-lg px-3 py-2 hover:bg-stone-100">
              Add song
            </Link>
            <form action={logout}>
              <button type="submit" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
