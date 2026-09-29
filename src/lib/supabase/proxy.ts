import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "./env";

// Pages a logged-out visitor may open. Everything else redirects to /login.
// /reset-password and /auth/confirm are public because the password-reset link
// signs the person in *before* they choose a new password.
const PUBLIC_PATHS = [
  "/login",
  "/join",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// Called from the root proxy.ts on every page request:
//   1. refreshes the login session cookie when it is about to expire
//   2. sends logged-out visitors to /login (the page-level gate)
// This is only the first line of defence. Data access is protected by RLS.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = getSupabaseEnv();

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Write refreshed cookies to BOTH the request (so this render sees
        // them) and the response (so the browser stores them).
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // getClaims() checks the session token's signature; unlike getSession() it
  // can't be fooled by a forged cookie.
  const { data } = await supabase.auth.getClaims();
  const loggedIn = Boolean(data?.claims);
  const { pathname } = request.nextUrl;

  if (!loggedIn && !isPublic(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }

  // Already signed in? Skip the login / join screens.
  if (loggedIn && (pathname === "/login" || pathname === "/join")) {
    const home = request.nextUrl.clone();
    home.pathname = "/";
    home.search = "";
    return NextResponse.redirect(home);
  }

  return response;
}
