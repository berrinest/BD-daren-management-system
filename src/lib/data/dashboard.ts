import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getShanghaiDayRange } from "@/lib/formatters/date";

const HIGH_PRIORITY_LIMIT = 8;

export async function getDashboardData() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { todayStart, tomorrowStart } = getShanghaiDayRange();
  const [dueTasksResult, pendingCountResult, highPriorityResult, resourcesResult] =
    await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, talent_id, task_type, due_at, notes, talents!tasks_talent_owner_fk!inner(id, nickname, primary_platform, priority, stage, archived_at)",
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .is("talents.archived_at", null)
        .lt("due_at", tomorrowStart)
        .order("due_at", { ascending: true }),
      supabase
        .from("tasks")
        .select(
          "id, talents!tasks_talent_owner_fk!inner(archived_at)",
          { count: "exact", head: true },
        )
        .eq("user_id", userId)
        .eq("status", "pending")
        .is("talents.archived_at", null),
      supabase
        .from("talents")
        .select("id, nickname, primary_platform, priority, stage")
        .eq("user_id", userId)
        .eq("priority", "high")
        .is("archived_at", null)
        .order("updated_at", { ascending: false })
        .limit(HIGH_PRIORITY_LIMIT),
      supabase
        .from("talent_resources")
        .select(
          "id, nickname, primary_platform, category, priority, processing_status, source, next_action_at",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .eq("status", "new")
        .neq("processing_status", "paused")
        .lt("next_action_at", tomorrowStart)
        .order("next_action_at", { ascending: true })
        .limit(8),
    ]);

  if (
    dueTasksResult.error ||
    pendingCountResult.error ||
    highPriorityResult.error ||
    resourcesResult.error
  ) {
    throw new Error("Dashboard data could not be loaded");
  }

  const dueTasks = dueTasksResult.data ?? [];
  const todayTaskCount = dueTasks.filter(
    (task) => task.due_at >= todayStart,
  ).length;
  const overdueTaskCount = dueTasks.length - todayTaskCount;

  return {
    dueTasks,
    highPriorityTalents: highPriorityResult.data ?? [],
    pendingResources: resourcesResult.data ?? [],
    pendingResourceCount: resourcesResult.count ?? 0,
    summary: {
      overdueTaskCount,
      pendingTaskCount: pendingCountResult.count ?? 0,
      todayTaskCount,
    },
  };
}
