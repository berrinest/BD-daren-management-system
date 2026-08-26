import { NextResponse } from "next/server";

import { listAgentInstances } from "@/lib/data/agent-instances";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const auth = await authenticateAgentApiRequest(request);
  if (!auth) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
      { headers: noStoreHeaders, status: 401 },
    );
  }

  const { data, error } = await listAgentInstances(auth.supabase, auth.userId);
  if (error) {
    return NextResponse.json(
      { error: { code: "AGENTS_UNAVAILABLE", message: "Agent instances are temporarily unavailable" } },
      { headers: noStoreHeaders, status: 500 },
    );
  }

  return NextResponse.json({ agents: data ?? [] }, { headers: noStoreHeaders });
}
