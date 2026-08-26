import { NextResponse } from "next/server";

import { heartbeatAgentInstance } from "@/lib/data/agent-instances";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";
import {
  agentInstanceParamsSchema,
  heartbeatAgentInstanceSchema,
} from "@/lib/validations";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = agentInstanceParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return NextResponse.json(
      { error: { code: "INVALID_AGENT_ID", message: "A valid Agent id is required" } },
      { headers: noStoreHeaders, status: 400 },
    );
  }

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

  const input = heartbeatAgentInstanceSchema.safeParse(body);
  if (!input.success) {
    return NextResponse.json(
      { error: { code: "INVALID_REQUEST", message: input.error.issues[0]?.message ?? "Invalid Agent heartbeat" } },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  const { data, error } = await heartbeatAgentInstance(
    auth.supabase,
    auth.userId,
    params.data.id,
    input.data,
  );
  if (error) {
    return NextResponse.json(
      { error: { code: "HEARTBEAT_FAILED", message: "Agent heartbeat failed" } },
      { headers: noStoreHeaders, status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: { code: "AGENT_NOT_FOUND", message: "Agent instance not found or revoked" } },
      { headers: noStoreHeaders, status: 404 },
    );
  }

  return NextResponse.json({ agent: data }, { headers: noStoreHeaders, status: 200 });
}
