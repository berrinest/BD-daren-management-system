import { NextResponse } from "next/server";
import { z } from "zod";

import { claimAgentTask } from "@/lib/data/agent";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";

export const dynamic = "force-dynamic";

const claimParamsSchema = z.object({ id: z.uuid() });
const claimBodySchema = z.object({
  agent_id: z.uuid("agent_id must be a valid Agent instance id"),
}).strict();
const noStoreHeaders = { "Cache-Control": "private, no-store" };

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    { error: { code, message } },
    { headers: noStoreHeaders, status },
  );
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const params = claimParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return errorResponse("INVALID_TASK_ID", "A valid task id is required", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const input = claimBodySchema.safeParse(body);
  if (!input.success) {
    return errorResponse(
      "INVALID_REQUEST",
      input.error.issues[0]?.message ?? "Invalid claim request",
      400,
    );
  }

  try {
    const auth = await authenticateAgentApiRequest(request);
    if (!auth) {
      return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }
    const result = await claimAgentTask(
      auth.supabase,
      auth.userId,
      params.data.id,
      input.data.agent_id,
    );
    if (result.status === "not_found") {
      return errorResponse("TASK_NOT_FOUND", "Task not found", 404);
    }
    if (result.status === "conflict") {
      return errorResponse(
        "TASK_NOT_CLAIMABLE",
        "Task is not pending or has already been claimed",
        409,
      );
    }
    if (result.status === "invalid_agent") {
      return errorResponse(
        "AGENT_NOT_ACTIVE",
        "Agent instance was not found or is not active",
        409,
      );
    }
    if (result.status === "unsupported_task") {
      return errorResponse("TASK_NOT_SUPPORTED", "Task is not supported by this Agent", 409);
    }
    if (result.status !== "ok") {
      return errorResponse("CLAIM_UNAVAILABLE", "Task claim is temporarily unavailable", 500);
    }

    return NextResponse.json(result.claim, {
      headers: noStoreHeaders,
      status: 200,
    });
  } catch {
    return errorResponse(
      "CLAIM_UNAVAILABLE",
      "Task claim is temporarily unavailable",
      500,
    );
  }
}
