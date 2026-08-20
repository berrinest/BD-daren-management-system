import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const HIGH_PRIORITY_LIMIT = 8;

function getShanghaiDayRange(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Shanghai",
    year: "numeric",
  })
    .formatToParts(now)
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value;
      return result;
    }, {});

  const todayStart = new Date(
    `${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`,
  );
  const tomorrowStart = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

  return {
    todayStart: todayStart.toISOString(),
    tomorrowStart: tomorrowStart.toISOString(),
  };
}

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
          "id, nickname, primary_platform, category, priority, source, discovered_at",
          { count: "exact" },
        )
        .eq("user_id", userId)
        .eq("status", "new")
        .order("priority", { ascending: true })
        .order("discovered_at", { ascending: false })
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
