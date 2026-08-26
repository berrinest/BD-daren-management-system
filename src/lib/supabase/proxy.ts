import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabasePublicEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const PUBLIC_ROUTES = new Set(["/login"]);
const SELF_AUTHENTICATING_API_PREFIX = "/api/agent";
const DEVELOPMENT_SESSION_DEBUG_ROUTE = "/api/debug/session";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const env = getSupabasePublicEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);
  const isPublicRoute = PUBLIC_ROUTES.has(request.nextUrl.pathname)
    || request.nextUrl.pathname === DEVELOPMENT_SESSION_DEBUG_ROUTE
    || request.nextUrl.pathname === SELF_AUTHENTICATING_API_PREFIX
    || request.nextUrl.pathname.startsWith(`${SELF_AUTHENTICATING_API_PREFIX}/`);

  if (!isAuthenticated && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthenticated && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
