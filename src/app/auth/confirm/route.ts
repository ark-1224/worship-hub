import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Landing page for links in Supabase emails (confirm email, reset password).
// Supports both link styles Supabase can send:
//   ?code=...                      (default "PKCE" links)
//   ?token_hash=...&type=recovery  (custom email template, works across devices)
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Only allow redirecting to a path on this site, never to another domain.
  const nextParam = searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const supabase = await createClient();
  let ok = false;

  if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  } else if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  }

  if (ok) return NextResponse.redirect(new URL(next, origin));

  const message = "That link is invalid or has expired. Please request a new one.";
  return NextResponse.redirect(new URL("/login?error=" + encodeURIComponent(message), origin));
}
