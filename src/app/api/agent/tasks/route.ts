import { NextResponse } from "next/server";
import { z } from "zod";

import {
  AGENT_SUPPORTED_TASK_TYPES,
  getTodayAgentTasks,
} from "@/lib/data/agent";
import { authenticateAgentApiRequest } from "@/lib/supabase/agent-api";

export const dynamic = "force-dynamic";

const agentTasksQuerySchema = z.object({
  scope: z.literal("today").default("today"),
  task_type: z.enum(AGENT_SUPPORTED_TASK_TYPES).optional(),
}).strict();

const noStoreHeaders = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const input = agentTasksQuerySchema.safeParse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (!input.success) {
    return NextResponse.json(
      { error: { code: "INVALID_QUERY", message: "Only scope=today is supported" } },
      { headers: noStoreHeaders, status: 400 },
    );
  }

  try {
    const auth = await authenticateAgentApiRequest(request);
    if (!auth) {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
        { headers: noStoreHeaders, status: 401 },
      );
    }

    const result = await getTodayAgentTasks(
      auth.supabase,
      auth.userId,
      input.data.task_type,
    );
    if (result.status !== "ok") {
      return NextResponse.json(
        { error: { code: "UNAUTHENTICATED", message: "Authentication required" } },
        { headers: noStoreHeaders, status: 401 },
      );
    }
    return NextResponse.json(
      { tasks: result.tasks },
      { headers: noStoreHeaders, status: 200 },
    );
  } catch {
    return NextResponse.json(
      { error: { code: "TASKS_UNAVAILABLE", message: "Tasks are temporarily unavailable" } },
      { headers: noStoreHeaders, status: 500 },
    );
  }
}
