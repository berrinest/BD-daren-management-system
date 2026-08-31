import type { SupabaseClient } from "@supabase/supabase-js";

import { getActiveAgentInstance } from "@/lib/data/agent-instances";
import {
  getWechatExecutionSnapshot,
  type AgentWechatExecutionDto,
} from "@/lib/data/agent-task-dto";
import { getShanghaiDayRange } from "@/lib/formatters/date";
import type { Database } from "@/types/database";

export const AGENT_SUPPORTED_TASK_TYPES = [
  "wechat_add_friend",
  "desktop_test",
] as const;
export type AgentSupportedTaskType = (typeof AGENT_SUPPORTED_TASK_TYPES)[number];

export type AgentTaskTargetDto = {
  id: string;
  nickname: string;
  platform: string;
  platform_account: string | null;
  type: "resource" | "talent";
  wechat: string | null;
};

export type AgentTaskDto = {
  created_at: string;
  due_at: string;
  execution: AgentWechatExecutionDto | null;
  execution_status:
    | "claimed"
    | "failed"
    | "ready_to_submit"
    | "running"
    | "safe_stop"
    | "timeout"
    | null;
  next_action: string | null;
  status: "in_progress" | "pending";
  target: AgentTaskTargetDto;
  task_id: string;
  task_type: string;
};

export type AgentTasksResult =
  | { status: "ok"; tasks: AgentTaskDto[] }
  | { status: "unauthenticated" };

export type AgentTaskClaimDto = {
  agent_id: string;
  execution_status: "claimed";
  started_at: string;
  status: "in_progress";
  task_id: string;
};

export type AgentTaskClaimResult =
  | { claim: AgentTaskClaimDto; status: "ok" }
  | {
      status:
        | "conflict"
        | "invalid_agent"
        | "not_found"
        | "unauthenticated"
        | "unsupported_task";
    };

export const AGENT_RESOURCE_RESULT_CODES = [
  "friend_request_sent",
  "friend_request_accepted",
  "no_response",
  "rejected",
] as const;

export const AGENT_TALENT_RESULT_CODES = [
  "friend_request_sent",
  "replied",
  "interested",
  "quote_sent",
  "cooperation_confirmed",
  "rejected",
] as const;

export const AGENT_INTERNAL_RESULT_CODES = ["desktop_test_completed"] as const;

export type AgentTaskResultCode =
  | (typeof AGENT_RESOURCE_RESULT_CODES)[number]
  | (typeof AGENT_TALENT_RESULT_CODES)[number]
  | (typeof AGENT_INTERNAL_RESULT_CODES)[number];

export type AgentTaskResultInput = {
  next_action: string | null;
  next_action_at: string | null;
  occurred_at: string;
  result_code: AgentTaskResultCode;
  result_notes: string | null;
};

export type AgentTaskResultSubmission =
  | {
      result: { result_code: AgentTaskResultCode };
      status: "ok";
      task: { status: "completed"; task_id: string };
    }
  | { status: "conflict" | "invalid_result" | "not_found" | "unauthenticated" };

type AgentTaskClaimUpdate = {
  agent_current_action: "claimed";
  agent_last_error: null;
  agent_id: string;
  agent_execution_status: "claimed";
  execution_source: "agent";
  started_at: string;
  status: "in_progress";
};

export async function claimAgentTask(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: string,
  agentId: string,
): Promise<AgentTaskClaimResult> {
  const { data: agent, error: agentError } = await getActiveAgentInstance(
    supabase,
    userId,
    agentId,
  );
  if (agentError) throw new Error("Agent instance could not be checked");
  if (!agent) return { status: "invalid_agent" };

  const { data: existingTask, error: lookupError } = await supabase
    .from("tasks")
    .select("id, status, task_type")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw new Error("Agent task could not be checked");
  if (!existingTask) return { status: "not_found" };
  if (!AGENT_SUPPORTED_TASK_TYPES.includes(existingTask.task_type as AgentSupportedTaskType)) {
    return { status: "unsupported_task" };
  }
  if (existingTask.status !== "pending") return { status: "conflict" };

  const startedAt = new Date().toISOString();
  const update: AgentTaskClaimUpdate = {
    agent_current_action: "claimed",
    agent_last_error: null,
    agent_id: agentId,
    agent_execution_status: "claimed",
    execution_source: "agent",
    started_at: startedAt,
    status: "in_progress",
  };
  const { data: claimedTask, error: claimError } = await supabase
    .from("tasks")
    .update(update as never)
    .eq("id", taskId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id, status, started_at")
    .maybeSingle();
  if (claimError) throw new Error("Agent task could not be claimed");
  if (!claimedTask) return { status: "conflict" };

  return {
    claim: {
      agent_id: agentId,
      execution_status: "claimed",
      started_at: claimedTask.started_at ?? startedAt,
      status: "in_progress",
      task_id: claimedTask.id,
    },
    status: "ok",
  };
}

export async function submitAgentTaskResult(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: string,
  input: AgentTaskResultInput,
  agentId?: string,
): Promise<AgentTaskResultSubmission> {
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, status, task_type, talent_id, resource_id, agent_id, agent_execution_status" as never)
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (taskError) throw new Error("Agent task could not be checked");
  if (!task) return { status: "not_found" };
  const claimedTask = task as unknown as {
    agent_execution_status: string | null;
    agent_id: string | null;
    id: string;
    resource_id: string | null;
    status: string;
    talent_id: string | null;
    task_type: string;
  };
  if (claimedTask.status !== "in_progress") return { status: "conflict" };
  if (
    agentId
    && (
      claimedTask.agent_id !== agentId
      || claimedTask.agent_execution_status !== "running"
    )
  ) {
    return { status: "conflict" };
  }

  const allowedResults = claimedTask.task_type === "desktop_test"
    ? new Set<string>(AGENT_INTERNAL_RESULT_CODES)
    : claimedTask.talent_id
      ? new Set<string>(AGENT_TALENT_RESULT_CODES)
      : claimedTask.resource_id
        ? new Set<string>(AGENT_RESOURCE_RESULT_CODES)
        : null;
  if (!allowedResults?.has(input.result_code)) {
    return { status: "invalid_result" };
  }

  const rpcResult = await supabase.rpc(
    "complete_agent_task_result" as never,
    {
      p_next_action: input.next_action,
      p_next_action_at: input.next_action_at,
      p_occurred_at: input.occurred_at,
      p_result_code: input.result_code,
      p_result_notes: input.result_notes,
      p_task_id: taskId,
    } as never,
  ) as unknown as {
    data: Array<{ result_code: string; status: string; task_id: string }> | null;
    error: { code?: string } | null;
  };

  if (rpcResult.error) {
    if (rpcResult.error.code === "P0002") return { status: "conflict" };
    if (rpcResult.error.code === "22023") return { status: "invalid_result" };
    throw new Error("Agent task result could not be applied");
  }

  const completedTask = rpcResult.data?.[0];
  if (!completedTask || completedTask.status !== "completed") {
    throw new Error("Agent task result was not completed");
  }

  return {
    result: { result_code: input.result_code },
    status: "ok",
    task: { status: "completed", task_id: completedTask.task_id },
  };
}

export async function getTodayAgentTasks(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskType?: AgentSupportedTaskType,
  now = new Date(),
): Promise<AgentTasksResult> {
  const { todayStart, tomorrowStart } = getShanghaiDayRange(now);
  let query = supabase
    .from("tasks")
    .select("id, task_type, status, due_at, next_action, created_at, talent_id, resource_id, agent_execution_status, execution_wechat_id, execution_expected_nickname, execution_talent_level, execution_greeting_message, execution_remark, talents!tasks_talent_owner_fk(id, nickname, primary_platform, platform_account, wechat), talent_resources!tasks_resource_owner_fk(id, nickname, primary_platform, platform_account, wechat)" as never)
    .eq("user_id", userId)
    .in("task_type", [...AGENT_SUPPORTED_TASK_TYPES])
    .in("status", ["pending", "in_progress"])
    .gte("due_at", todayStart)
    .lt("due_at", tomorrowStart);

  if (taskType) query = query.eq("task_type", taskType);

  const { data, error } = await query
    .order("due_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Agent tasks could not be loaded");

  const rows = (data ?? []) as unknown as Array<{
    agent_execution_status: AgentTaskDto["execution_status"];
    created_at: string;
    due_at: string;
    execution_expected_nickname: string | null;
    execution_greeting_message: string | null;
    execution_remark: string | null;
    execution_talent_level: string | null;
    execution_wechat_id: string | null;
    id: string;
    next_action: string | null;
    resource_id: string | null;
    status: string;
    talent_id: string | null;
    talent_resources: {
      id: string;
      nickname: string;
      platform_account: string | null;
      primary_platform: string;
      wechat: string | null;
    } | null;
    talents: {
      id: string;
      nickname: string;
      platform_account: string | null;
      primary_platform: string;
      wechat: string | null;
    } | null;
    task_type: string;
  }>;
  const tasks = rows.flatMap<AgentTaskDto>((task) => {
    if (task.talent_id && task.talents) {
      return [{
        created_at: task.created_at,
        due_at: task.due_at,
        execution: getWechatExecutionSnapshot(task),
        execution_status: task.agent_execution_status,
        next_action: task.next_action,
        status: task.status as AgentTaskDto["status"],
        target: {
          id: task.talents.id,
          nickname: task.talents.nickname,
          platform: task.talents.primary_platform,
          platform_account: task.talents.platform_account,
          type: "talent",
          wechat: task.talents.wechat,
        },
        task_id: task.id,
        task_type: task.task_type,
      }];
    }

    if (task.resource_id && task.talent_resources) {
      return [{
        created_at: task.created_at,
        due_at: task.due_at,
        execution: null,
        execution_status: task.agent_execution_status,
        next_action: task.next_action,
        status: task.status as AgentTaskDto["status"],
        target: {
          id: task.talent_resources.id,
          nickname: task.talent_resources.nickname,
          platform: task.talent_resources.primary_platform,
          platform_account: task.talent_resources.platform_account,
          type: "resource",
          wechat: task.talent_resources.wechat,
        },
        task_id: task.id,
        task_type: task.task_type,
      }];
    }

    return [];
  });

  return { status: "ok", tasks };
}

export type AgentExecutionState =
  | "claimed"
  | "failed"
  | "ready_to_submit"
  | "running"
  | "safe_stop"
  | "timeout";

export type AgentExecutionStateInput = {
  action: string | null;
  durationMs: number | null;
  error: string | null;
  errorCode: string | null;
  evidenceRef: string | null;
  resultPayload: Record<string, unknown> | null;
  state: AgentExecutionState;
  stopReason: string | null;
};

export async function updateAgentTaskExecutionState(
  supabase: SupabaseClient<Database>,
  userId: string,
  taskId: string,
  agentId: string,
  input: AgentExecutionStateInput,
) {
  const { data: agent, error: agentError } = await getActiveAgentInstance(
    supabase,
    userId,
    agentId,
  );
  if (agentError) throw new Error("Agent instance could not be checked");
  if (!agent) return { status: "invalid_agent" as const };

  const terminal = ["ready_to_submit", "safe_stop", "timeout", "failed"].includes(input.state);
  const startedAtResult = terminal
    ? await supabase
      .from("tasks")
      .select("started_at")
      .eq("id", taskId)
      .eq("user_id", userId)
      .eq("agent_id", agentId)
      .eq("status", "in_progress")
      .maybeSingle()
    : { data: null, error: null };
  if (startedAtResult.error) throw new Error("Agent execution timing could not be loaded");
  const measuredDuration = startedAtResult.data?.started_at
    ? Math.max(0, Date.now() - new Date(startedAtResult.data.started_at).getTime())
    : 0;
  const failedLegacyFallback = input.state === "failed";
  const result = await supabase
    .from("tasks")
    .update({
      agent_current_action: input.action,
      agent_duration_ms: terminal ? input.durationMs ?? measuredDuration : null,
      agent_error_code: terminal && input.state !== "ready_to_submit"
        ? input.errorCode ?? (failedLegacyFallback ? "EXECUTOR_FAILED" : null)
        : null,
      agent_evidence_ref: terminal ? input.evidenceRef : null,
      agent_execution_status: input.state,
      agent_finished_at: terminal ? new Date().toISOString() : null,
      agent_last_error: input.state === "failed" ? input.error : null,
      agent_result_payload: terminal
        ? input.resultPayload ?? (failedLegacyFallback ? { legacy: true } : null)
        : null,
      agent_stop_reason: terminal && input.state !== "ready_to_submit"
        ? input.stopReason ?? (failedLegacyFallback ? "EXECUTOR_FAILED" : null)
        : null,
    } as never)
    .eq("id", taskId)
    .eq("user_id", userId)
    .eq("agent_id", agentId)
    .eq("status", "in_progress")
    .select("id, status, agent_execution_status, agent_current_action, agent_last_error" as never)
    .maybeSingle();
  if (result.error) throw new Error("Agent execution state could not be updated");
  if (!result.data) return { status: "conflict" as const };

  return {
    state: {
      execution_status: input.state,
      current_action: input.action,
      error: input.state === "failed" ? input.error : null,
      status: "in_progress" as const,
      task_id: taskId,
    },
    status: "ok" as const,
  };
}
