import { NextResponse } from "next/server";

import { registerAgentInstance } from "@/lib/data/agent-instances";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";
import { registerAgentInstanceSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const auth = await authenticateAgentApiRequest(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const input = registerAgentInstanceSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: input.error.issues[0]?.message ?? "Invalid Agent registration" } },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const { data, error } = await registerAgentInstance(auth.supabase, auth.userId, input.data);
  if (error || !data) {
    return NextResponse.json(
      { error: { code: "REGISTRATION_FAILED", message: "Agent registration failed" } },
      { headers: noStoreHeaders, status: 500 },
    );
  }

  return NextResponse.json({ agent: data }, { headers: noStoreHeaders, status: 200 });
}
