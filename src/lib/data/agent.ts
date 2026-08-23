import { getShanghaiDayRange } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

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
  started_at: string;
  status: "in_progress";
  task_id: string;
};

export type AgentTaskClaimResult =
  | { claim: AgentTaskClaimDto; status: "ok" }
  | { status: "conflict" | "not_found" | "unauthenticated" };

type AgentTaskClaimUpdate = {
  agent_id: string;
  execution_source: "agent";
  started_at: string;
  status: "in_progress";
};

export async function claimAgentTask(
  taskId: string,
  agentId: string,
): Promise<AgentTaskClaimResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { status: "unauthenticated" };

  const { data: existingTask, error: lookupError } = await supabase
    .from("tasks")
    .select("id, status")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (lookupError) throw new Error("Agent task could not be checked");
  if (!existingTask) return { status: "not_found" };
  if (existingTask.status !== "pending") return { status: "conflict" };

  const startedAt = new Date().toISOString();
  const update: AgentTaskClaimUpdate = {
    agent_id: agentId,
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
      started_at: claimedTask.started_at ?? startedAt,
      status: "in_progress",
      task_id: claimedTask.id,
    },
    status: "ok",
  };
}

export async function getTodayAgentTasks(now = new Date()): Promise<AgentTasksResult> {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) return { status: "unauthenticated" };

  const { todayStart, tomorrowStart } = getShanghaiDayRange(now);
  const { data, error } = await supabase
    .from("tasks")
    .select("id, task_type, status, due_at, next_action, created_at, talent_id, resource_id, talents!tasks_talent_owner_fk(id, nickname, primary_platform, platform_account, wechat), talent_resources!tasks_resource_owner_fk(id, nickname, primary_platform, platform_account, wechat)")
    .eq("user_id", userId)
    .in("status", ["pending", "in_progress"])
    .gte("due_at", todayStart)
    .lt("due_at", tomorrowStart)
    .order("due_at", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error("Agent tasks could not be loaded");

  const tasks = (data ?? []).flatMap<AgentTaskDto>((task) => {
    if (task.talent_id && task.talents) {
      return [{
        created_at: task.created_at,
        due_at: task.due_at,
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
