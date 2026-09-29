import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/actions";
import { createClient } from "@/lib/supabase/server";

const NAV_LINKS = [
  { href: "/lineups", label: "Lineups" },
  { href: "/songs", label: "Library" },
  { href: "/songs/new", label: "Add song" },
];

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
        {/* Phones: brand + Log out on the first row, links on a second row. */}
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 px-4 py-1 text-sm font-medium">
          <Link href="/" className="py-2 text-lg font-bold text-accent-700">
            Worship Hub
          </Link>
          <nav
            aria-label="Main"
            className="order-3 -mx-2 flex w-full items-center gap-1 sm:order-2 sm:mx-0 sm:w-auto sm:gap-2"
          >
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg px-3 py-2 hover:bg-stone-100">
                {link.label}
              </Link>
            ))}
          </nav>
          <form action={logout} className="order-2 sm:order-3">
            <button type="submit" className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-100">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
