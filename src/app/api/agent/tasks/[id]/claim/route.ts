import { NextResponse } from "next/server";
import { z } from "zod";

import { claimAgentTask } from "@/lib/data/agent";

export const dynamic = "force-dynamic";

const claimParamsSchema = z.object({ id: z.uuid() });
const claimBodySchema = z.object({
  agent_id: z
    .string()
    .trim()
    .min(3, "agent_id must contain at least 3 characters")
    .max(100, "agent_id must not exceed 100 characters")
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/, "agent_id contains unsupported characters"),
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
    const result = await claimAgentTask(params.data.id, input.data.agent_id);
    if (result.status === "unauthenticated") {
      return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }
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
