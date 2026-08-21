import { redirect } from "next/navigation";

import { getShanghaiDayRange } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

type Timing = "overdue" | "today" | "new";

export type RecentContact = {
  method: string;
  occurredAt: string;
  result: string;
};

export type DashboardWorkItem = {
  actionType: string;
  dueAt: string | null;
  id: string;
  kind: "talent_task" | "resource";
  nickname: string;
  platform: string;
  priority: string;
  recentContact: RecentContact | null;
  resourceId?: string;
  state: string;
  talentId?: string;
  taskId?: string;
  timing: Timing;
  wechat?: string | null;
};

export type StaleTalentReminder = {
  id: string;
  lastActivityAt: string;
  nickname: string;
  platform: string;
  priority: string;
  recentContact: RecentContact | null;
  stage: string;
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
  const inactivityCutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const [tasksResult, dueResourcesResult, newResourcesResult, staleCandidatesResult] = await Promise.all([
    supabase.from("tasks").select("id, talent_id, task_type, due_at, talents!tasks_talent_owner_fk!inner(id, nickname, primary_platform, priority, stage, archived_at, wechat)").eq("user_id", userId).eq("status", "pending").is("talents.archived_at", null).lt("due_at", tomorrowStart),
    supabase.from("talent_resources").select("id, nickname, primary_platform, priority, processing_status, next_action_at, wechat").eq("user_id", userId).eq("status", "new").neq("processing_status", "paused").neq("processing_status", "pending_add").not("next_action_at", "is", null).lt("next_action_at", tomorrowStart),
    supabase.from("talent_resources").select("id, nickname, primary_platform, priority, processing_status, discovered_at, wechat").eq("user_id", userId).eq("status", "new").eq("processing_status", "pending_add").or(`next_action_at.is.null,next_action_at.lt.${tomorrowStart}`),
    supabase.from("talents").select("id, nickname, primary_platform, priority, stage, created_at, updated_at").eq("user_id", userId).is("archived_at", null).neq("priority", "paused").not("stage", "in", "(completed,rejected)").lt("created_at", inactivityCutoff).lt("updated_at", inactivityCutoff).order("updated_at", { ascending: true }).limit(100),
  ]);

  if (tasksResult.error || dueResourcesResult.error || newResourcesResult.error || staleCandidatesResult.error) throw new Error("Dashboard data could not be loaded");

  const taskTalentIds = [...new Set((tasksResult.data ?? []).map((task) => task.talent_id))];
  const staleCandidateIds = (staleCandidatesResult.data ?? []).map((talent) => talent.id);
  const contactTalentIds = [...new Set([...taskTalentIds, ...staleCandidateIds])];
  const resourceIds = [...new Set([...(dueResourcesResult.data ?? []), ...(newResourcesResult.data ?? [])].map((resource) => resource.id))];
  const emptyId = "00000000-0000-0000-0000-000000000000";
  const [talentContactsResult, resourceContactsResult, candidateTasksResult] = await Promise.all([
    supabase.from("talents").select("id, follow_up_records(occurred_at, method, result)").eq("user_id", userId).in("id", contactTalentIds.length > 0 ? contactTalentIds : [emptyId]).order("occurred_at", { ascending: false, referencedTable: "follow_up_records" }).limit(1, { referencedTable: "follow_up_records" }),
    supabase.from("talent_resources").select("id, resource_contact_records(occurred_at, method, result)").eq("user_id", userId).in("id", resourceIds.length > 0 ? resourceIds : [emptyId]).order("occurred_at", { ascending: false, referencedTable: "resource_contact_records" }).limit(1, { referencedTable: "resource_contact_records" }),
    supabase.from("tasks").select("talent_id").eq("user_id", userId).eq("status", "pending").in("talent_id", staleCandidateIds.length > 0 ? staleCandidateIds : [emptyId]),
  ]);

  if (talentContactsResult.error || resourceContactsResult.error || candidateTasksResult.error) throw new Error("Dashboard activity data could not be loaded");

  const talentContactMap = new Map<string, RecentContact>();
  for (const talent of talentContactsResult.data ?? []) {
    const contact = talent.follow_up_records[0];
    if (contact) talentContactMap.set(talent.id, { method: contact.method, occurredAt: contact.occurred_at, result: contact.result });
  }
  const resourceContactMap = new Map<string, RecentContact>();
  for (const resource of resourceContactsResult.data ?? []) {
    const contact = resource.resource_contact_records[0];
    if (contact) resourceContactMap.set(resource.id, { method: contact.method, occurredAt: contact.occurred_at, result: contact.result });
  }

  const taskItems: DashboardWorkItem[] = (tasksResult.data ?? []).map((task) => ({
    actionType: task.task_type,
    dueAt: task.due_at,
    id: `task:${task.id}`,
    kind: "talent_task",
    nickname: task.talents.nickname,
    platform: task.talents.primary_platform,
    priority: task.talents.priority,
    recentContact: talentContactMap.get(task.talent_id) ?? null,
    state: task.talents.stage,
    talentId: task.talent_id,
    taskId: task.id,
    timing: task.due_at < todayStart ? "overdue" : "today",
    wechat: task.talents.wechat,
  }));

  const dueResourceItems: DashboardWorkItem[] = (dueResourcesResult.data ?? []).map((resource) => ({
    actionType: "continue_resource",
    dueAt: resource.next_action_at,
    id: `resource:${resource.id}`,
    kind: "resource",
    nickname: resource.nickname,
    platform: resource.primary_platform,
    priority: resource.priority,
    recentContact: resourceContactMap.get(resource.id) ?? null,
    resourceId: resource.id,
    state: resource.processing_status,
    timing: resource.next_action_at && resource.next_action_at < todayStart ? "overdue" : "today",
    wechat: resource.wechat,
  }));

  const newResourceItems: DashboardWorkItem[] = (newResourcesResult.data ?? []).map((resource) => ({
    actionType: "first_resource",
    dueAt: resource.discovered_at,
    id: `resource:${resource.id}`,
    kind: "resource",
    nickname: resource.nickname,
    platform: resource.primary_platform,
    priority: resource.priority,
    recentContact: resourceContactMap.get(resource.id) ?? null,
    resourceId: resource.id,
    state: resource.processing_status,
    timing: "new",
    wechat: resource.wechat,
  }));

  const workItems = [...taskItems, ...dueResourceItems, ...newResourceItems].sort(compareWorkItems);
  const talentsWithPendingTasks = new Set((candidateTasksResult.data ?? []).map((task) => task.talent_id));
  const staleTalents: StaleTalentReminder[] = (staleCandidatesResult.data ?? [])
    .filter((talent) => {
      const recentContact = talentContactMap.get(talent.id);
      return !talentsWithPendingTasks.has(talent.id) && (!recentContact || recentContact.occurredAt < inactivityCutoff);
    })
    .map((talent) => {
      const recentContact = talentContactMap.get(talent.id) ?? null;
      return {
        id: talent.id,
        lastActivityAt: recentContact && recentContact.occurredAt > talent.updated_at ? recentContact.occurredAt : talent.updated_at,
        nickname: talent.nickname,
        platform: talent.primary_platform,
        priority: talent.priority,
        recentContact,
        stage: talent.stage,
      };
    })
    .sort((left, right) => left.lastActivityAt.localeCompare(right.lastActivityAt))
    .slice(0, 8);
  return {
    summary: {
      dueResourceCount: dueResourceItems.length,
      newResourceCount: newResourceItems.length,
      overdueCount: workItems.filter((item) => item.timing === "overdue").length,
      todayTaskCount: taskItems.filter((item) => item.timing === "today").length,
    },
    staleTalents,
    workItems,
  };
}
