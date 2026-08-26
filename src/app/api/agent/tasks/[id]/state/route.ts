import { NextResponse } from "next/server";
import { z } from "zod";

import { updateAgentTaskExecutionState } from "@/lib/data/agent";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({
  agent_id: z.uuid(),
  state: z.enum(["running", "failed"]),
}).strict();
const headers = { "Cache-Control": "private, no-store" };

function error(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { headers, status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = paramsSchema.safeParse(await context.params);
  if (!params.success) return error("INVALID_TASK_ID", "A valid task id is required", 400);

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("INVALID_JSON", "Request body must be valid JSON", 400);
  }
  const input = bodySchema.safeParse(body);
  if (!input.success) {
    return error("INVALID_REQUEST", input.error.issues[0]?.message ?? "Invalid state request", 400);
  }

  const auth = await authenticateAgentApiRequest(request);
  if (!auth) return error("UNAUTHENTICATED", "Authentication required", 401);

  try {
    const result = await updateAgentTaskExecutionState(
      auth.supabase,
      auth.userId,
      params.data.id,
      input.data.agent_id,
      input.data.state,
    );
    if (result.status === "invalid_agent") {
      return error("AGENT_NOT_ACTIVE", "Agent instance was not found or is not active", 409);
    }
    if (result.status === "conflict") {
      return error("TASK_NOT_OWNED", "Task is not in progress or is owned by another Agent", 409);
    }
    return NextResponse.json(result.state, { headers, status: 200 });
  } catch {
    return error("STATE_UPDATE_FAILED", "Agent execution state could not be updated", 500);
  }
}
