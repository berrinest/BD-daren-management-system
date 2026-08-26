import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

function unavailable() {
  return NextResponse.json(
    { error: { code: "NOT_FOUND", message: "Not found" } },
    { headers: noStoreHeaders, status: 404 },
  );
}

export async function GET() {
  // TODO(Phase 8.6): Delete this development-only session debugging endpoint.
  if (process.env.NODE_ENV !== "development") return unavailable();

  const supabase = await createClient();
  const [{ data: sessionData, error: sessionError }, { data: claimsData, error: claimsError }] =
    await Promise.all([
      supabase.auth.getSession(),
      supabase.auth.getClaims(),
    ]);
  const session = sessionData.session;
  const userId = claimsData?.claims?.sub;

  if (sessionError || claimsError || !session || !userId || session.user.id !== userId) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  return NextResponse.json(
    {
      access_token: session.access_token,
      email: session.user.email ?? null,
      expires_at: session.expires_at ?? null,
      user_id: userId,
    },
    { headers: noStoreHeaders, status: 200 },
  );
}
