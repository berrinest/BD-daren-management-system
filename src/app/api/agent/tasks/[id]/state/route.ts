import { NextResponse } from "next/server";
import { z } from "zod";

import { updateAgentTaskExecutionState } from "@/lib/data/agent";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.uuid() });
const bodySchema = z.object({
  action: z.string().trim().min(1).max(100).optional(),
  agent_id: z.uuid(),
  duration_ms: z.number().int().nonnegative().optional(),
  error: z.string().trim().min(1).max(1000).optional(),
  error_code: z.string().trim().min(1).max(100).optional(),
  evidence_ref: z.string().trim().min(1).max(200).optional(),
  result_payload: z.record(z.string(), z.unknown()).optional(),
  state: z.enum(["claimed", "running", "ready_to_submit", "safe_stop", "timeout", "failed"]),
  stop_reason: z.string().trim().min(1).max(100).optional(),
}).strict().superRefine((value, context) => {
  if (value.state === "failed" && !value.error) {
    context.addIssue({ code: "custom", message: "A failure reason is required", path: ["error"] });
  }
  if (["ready_to_submit", "safe_stop", "timeout"].includes(value.state)) {
    if (value.duration_ms === undefined) context.addIssue({ code: "custom", message: "duration_ms is required", path: ["duration_ms"] });
    if (!value.result_payload) context.addIssue({ code: "custom", message: "result_payload is required", path: ["result_payload"] });
  }
  if (["safe_stop", "timeout"].includes(value.state)) {
    if (!value.stop_reason) context.addIssue({ code: "custom", message: "stop_reason is required", path: ["stop_reason"] });
    if (!value.error_code) context.addIssue({ code: "custom", message: "error_code is required", path: ["error_code"] });
  }
});
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
      {
        action: input.data.action ?? null,
        durationMs: input.data.duration_ms ?? null,
        error: input.data.error ?? null,
        errorCode: input.data.error_code ?? null,
        evidenceRef: input.data.evidence_ref ?? null,
        resultPayload: input.data.result_payload ?? null,
        state: input.data.state,
        stopReason: input.data.stop_reason ?? null,
      },
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
