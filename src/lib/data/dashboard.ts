import { redirect } from "next/navigation";

import { getShanghaiDayRange } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

type Timing = "overdue" | "today" | "new";

export type DashboardWorkItem = {
  actionType: string;
  dueAt: string | null;
  id: string;
  kind: "talent_task" | "resource";
  nickname: string;
  platform: string;
  priority: string;
  resourceId?: string;
  state: string;
  talentId?: string;
  taskId?: string;
  timing: Timing;
};

const timingRank: Record<Timing, number> = { overdue: 0, today: 1, new: 2 };
const priorityRank: Record<string, number> = { high: 0, normal: 1, paused: 2 };

function compareWorkItems(left: DashboardWorkItem, right: DashboardWorkItem) {
  const timingDifference = timingRank[left.timing] - timingRank[right.timing];
  if (timingDifference !== 0) return timingDifference;
  const priorityDifference = (priorityRank[left.priority] ?? 3) - (priorityRank[right.priority] ?? 3);
  if (priorityDifference !== 0) return priorityDifference;
  const leftTime = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  const rightTime = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
  return leftTime - rightTime || left.nickname.localeCompare(right.nickname, "zh-CN");
}

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { todayStart, tomorrowStart } = getShanghaiDayRange();
  const [tasksResult, dueResourcesResult, newResourcesResult] = await Promise.all([
    supabase.from("tasks").select("id, talent_id, task_type, due_at, talents!tasks_talent_owner_fk!inner(id, nickname, primary_platform, priority, stage, archived_at)").eq("user_id", userId).eq("status", "pending").is("talents.archived_at", null).lt("due_at", tomorrowStart),
    supabase.from("talent_resources").select("id, nickname, primary_platform, priority, processing_status, next_action_at").eq("user_id", userId).eq("status", "new").neq("processing_status", "paused").neq("processing_status", "pending_add").not("next_action_at", "is", null).lt("next_action_at", tomorrowStart),
    supabase.from("talent_resources").select("id, nickname, primary_platform, priority, processing_status, discovered_at").eq("user_id", userId).eq("status", "new").eq("processing_status", "pending_add"),
  ]);

  if (tasksResult.error || dueResourcesResult.error || newResourcesResult.error) throw new Error("Dashboard data could not be loaded");

  const taskItems: DashboardWorkItem[] = (tasksResult.data ?? []).map((task) => ({
    actionType: task.task_type,
    dueAt: task.due_at,
    id: `task:${task.id}`,
    kind: "talent_task",
    nickname: task.talents.nickname,
    platform: task.talents.primary_platform,
    priority: task.talents.priority,
    state: task.talents.stage,
    talentId: task.talent_id,
    taskId: task.id,
    timing: task.due_at < todayStart ? "overdue" : "today",
  }));

  const dueResourceItems: DashboardWorkItem[] = (dueResourcesResult.data ?? []).map((resource) => ({
    actionType: "continue_resource",
    dueAt: resource.next_action_at,
    id: `resource:${resource.id}`,
    kind: "resource",
    nickname: resource.nickname,
    platform: resource.primary_platform,
    priority: resource.priority,
    resourceId: resource.id,
    state: resource.processing_status,
    timing: resource.next_action_at && resource.next_action_at < todayStart ? "overdue" : "today",
  }));

  const newResourceItems: DashboardWorkItem[] = (newResourcesResult.data ?? []).map((resource) => ({
    actionType: "first_resource",
    dueAt: resource.discovered_at,
    id: `resource:${resource.id}`,
    kind: "resource",
    nickname: resource.nickname,
    platform: resource.primary_platform,
    priority: resource.priority,
    resourceId: resource.id,
    state: resource.processing_status,
    timing: "new",
  }));

  const workItems = [...taskItems, ...dueResourceItems, ...newResourceItems].sort(compareWorkItems);
  return {
    summary: {
      dueResourceCount: dueResourceItems.length,
      newResourceCount: newResourceItems.length,
      overdueCount: workItems.filter((item) => item.timing === "overdue").length,
      todayTaskCount: taskItems.filter((item) => item.timing === "today").length,
    },
    workItems,
  };
}
