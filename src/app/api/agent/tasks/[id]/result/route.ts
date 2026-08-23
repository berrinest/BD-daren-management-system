import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AGENT_RESOURCE_RESULT_CODES,
  AGENT_TALENT_RESULT_CODES,
  submitAgentTaskResult,
} from "@/lib/data/agent";

export const dynamic = "force-dynamic";

const resultCodes = [
  ...AGENT_RESOURCE_RESULT_CODES,
  ...AGENT_TALENT_RESULT_CODES,
] as const;
const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable().optional(),
);
const resultParamsSchema = z.object({ id: z.uuid() });
const resultBodySchema = z.object({
  result_code: z.enum(resultCodes),
  result_notes: optionalText(2000),
  next_action: optionalText(500),
  next_action_at: z.iso.datetime({ offset: true }).nullable().optional(),
  occurred_at: z.iso.datetime({ offset: true }).optional(),
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
  const params = resultParamsSchema.safeParse(await context.params);
  if (!params.success) {
    return errorResponse("INVALID_TASK_ID", "A valid task id is required", 400);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be valid JSON", 400);
  }

  const input = resultBodySchema.safeParse(body);
  if (!input.success) {
    return errorResponse(
      "INVALID_REQUEST",
      input.error.issues[0]?.message ?? "Invalid task result",
      400,
    );
  }

  try {
    const result = await submitAgentTaskResult(params.data.id, {
      next_action: input.data.next_action ?? null,
      next_action_at: input.data.next_action_at ?? null,
      occurred_at: input.data.occurred_at ?? new Date().toISOString(),
      result_code: input.data.result_code,
      result_notes: input.data.result_notes ?? null,
    });

    if (result.status === "unauthenticated") {
      return errorResponse("UNAUTHENTICATED", "Authentication required", 401);
    }
    if (result.status === "not_found") {
      return errorResponse("TASK_NOT_FOUND", "Task not found", 404);
    }
    if (result.status === "conflict") {
      return errorResponse(
        "TASK_NOT_EXECUTABLE",
        "Task must be claimed and in progress before submitting a result",
        409,
      );
    }
    if (result.status === "invalid_result") {
      return errorResponse(
        "RESULT_NOT_APPLICABLE",
        "Result is not applicable to this task target",
        400,
      );
    }
    if (result.status !== "ok") {
      return errorResponse(
        "RESULT_SUBMISSION_FAILED",
        "Task result could not be applied",
        500,
      );
    }

    return NextResponse.json(
      { success: true, task: result.task, result: result.result },
      { headers: noStoreHeaders, status: 200 },
    );
  } catch {
    return errorResponse(
      "RESULT_SUBMISSION_FAILED",
      "Task result could not be applied",
      500,
    );
  }
}
