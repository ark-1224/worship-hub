import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 calls this file "proxy" (it was "middleware" in older versions).
// It runs before every page request. The real logic lives in lib/supabase/proxy.ts.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on every path except Next's static files and common image types.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
