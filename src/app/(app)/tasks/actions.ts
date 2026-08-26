"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  FOLLOW_UP_RESULTS,
  RESOURCE_CONTACT_RESULTS,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import {
  bulkCreateResourceTasksSchema,
  createTaskSchema,
  executeBdTaskSchema,
  recoverInProgressTaskSchema,
  taskMutationSchema,
} from "@/lib/validations";

const followUpResultSet = new Set<string>(FOLLOW_UP_RESULTS);
const resourceResultSet = new Set<string>(RESOURCE_CONTACT_RESULTS);

export async function executeBdTask(formData: FormData) {
  const input = executeBdTaskSchema.safeParse({
    task_id: formData.get("task_id"),
    result: formData.get("result"),
    notes: formData.get("notes"),
    next_action: formData.get("next_action"),
    next_action_at: formData.get("next_action_at"),
  });
  if (!input.success) {
    redirect(`/work?error=${encodeURIComponent(input.error.issues[0]?.message ?? "请检查执行结果")}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id, talent_id, resource_id")
    .eq("id", input.data.task_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();
  if (taskError || !task) {
    redirect("/work?error=该任务已不存在或已处理，请刷新后重试");
  }

  const occurredAt = new Date().toISOString();
  let convertedTalentId: string | null = null;

  if (task.talent_id) {
    if (!followUpResultSet.has(input.data.result)) {
      redirect("/work?error=该执行结果不适用于达人任务");
    }
    const { data, error } = await supabase.rpc("record_follow_up_and_schedule_next", {
      p_talent_id: task.talent_id,
      p_task_id: task.id,
      p_occurred_at: occurredAt,
      p_method: "wechat",
      p_result: input.data.result,
      p_notes: input.data.notes ?? undefined,
      p_next_task_due_at: input.data.next_action_at?.toISOString() ?? undefined,
      p_next_task_type: "follow_up",
      p_next_task_notes: input.data.next_action ?? undefined,
    });
    const result = data?.[0];
    const nextTaskMissing = Boolean(input.data.next_action_at && !result?.next_task_id);
    if (error || !result?.follow_up_record_id || !result.completed_task_id || nextTaskMissing) {
      redirect("/work?error=达人任务执行失败，请检查任务状态后重试");
    }
  } else if (task.resource_id) {
    if (!resourceResultSet.has(input.data.result)) {
      redirect("/work?error=该执行结果不适用于资源任务");
    }
    const { data, error } = await supabase.rpc("record_resource_contact_and_maybe_convert", {
      p_resource_id: task.resource_id,
      p_occurred_at: occurredAt,
      p_method: "wechat",
      p_result: input.data.result,
      p_notes: input.data.notes ?? undefined,
      p_next_action_at: input.data.next_action_at?.toISOString() ?? undefined,
    });
    const result = data?.[0];
    if (error || !result?.resource_contact_record_id) {
      redirect("/work?error=资源任务执行失败，请检查资源状态后重试");
    }
    convertedTalentId = result.converted_talent_id;
  } else {
    redirect("/work?error=任务没有有效的执行对象");
  }

  const completedAt = new Date().toISOString();
  const expectedStatus = task.talent_id ? "completed" : "pending";
  const { data: completedTask, error: updateError } = await supabase
    .from("tasks")
    .update({
      cancelled_at: null,
      completed_at: completedAt,
      next_action: input.data.next_action ?? null,
      next_action_at: input.data.next_action_at?.toISOString() ?? null,
      result_code: input.data.result,
      result_notes: input.data.notes ?? null,
      status: "completed",
    })
    .eq("id", task.id)
    .eq("user_id", userId)
    .eq("status", expectedStatus)
    .select("id")
    .maybeSingle();
  if (updateError || !completedTask) {
    redirect("/work?error=执行记录已保存，但任务状态更新失败，请刷新后检查");
  }

  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/tasks");
  if (task.talent_id) {
    revalidatePath("/talents");
    revalidatePath(`/talents/${task.talent_id}`);
  }
  if (task.resource_id) {
    revalidatePath("/resources");
    revalidatePath(`/resources/${task.resource_id}`);
  }
  if (convertedTalentId) {
    revalidatePath("/talents");
    revalidatePath(`/talents/${convertedTalentId}`);
  }
  const notice = new URLSearchParams({ notice: "bd-task-executed" });
  if (convertedTalentId) notice.set("autoConverted", "1");
  redirect(`/work?${notice}`);
}

export async function bulkCreateResourceTasks(formData: FormData) {
  const input = bulkCreateResourceTasksSchema.safeParse({
    resource_ids: formData.getAll("resource_ids"),
    task_type: formData.get("bulk_task_type"),
    due_at: formData.get("bulk_task_due_at"),
    notes: formData.get("bulk_task_notes"),
    next_action: formData.get("bulk_next_action"),
  });

  if (!input.success) {
    redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "请检查任务信息")}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: resources, error: resourceError } = await supabase
    .from("talent_resources")
    .select("id")
    .in("id", input.data.resource_ids)
    .eq("user_id", userId)
    .eq("status", "new");

  if (resourceError) redirect("/resources?error=资源验证失败，请稍后重试");

  const validResourceIds = resources?.map((resource) => resource.id) ?? [];
  if (validResourceIds.length > 0) {
    const dueAt = input.data.due_at.toISOString();
    const { error } = await supabase.from("tasks").insert(
      validResourceIds.map((resourceId) => ({
        creator_id: userId,
        due_at: dueAt,
        execution_source: "manual",
        next_action: input.data.next_action,
        next_action_at: dueAt,
        notes: input.data.notes,
        resource_id: resourceId,
        status: "pending",
        task_type: input.data.task_type,
        user_id: userId,
      })),
    );
    if (error) redirect("/resources?error=批量创建任务失败，请稍后重试");
  }

  const success = validResourceIds.length;
  const skipped = input.data.resource_ids.length - success;
  revalidatePath("/dashboard");
  revalidatePath("/resources");
  revalidatePath("/tasks");
  revalidatePath("/work");
  redirect(`/resources?notice=batch-tasks&success=${success}&skipped=${skipped}`);
}

export async function recoverInProgressTask(formData: FormData) {
  const input = recoverInProgressTaskSchema.safeParse({
    task_id: formData.get("task_id"),
  });
  if (!input.success) redirect("/tasks?error=任务信息无效，请刷新后重试");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: task, error } = await supabase
    .from("tasks")
    .update({
      agent_id: null,
      agent_current_action: null,
      agent_execution_status: null,
      agent_last_error: null,
      execution_source: "manual",
      started_at: null,
      status: "pending",
    } as never)
    .eq("id", input.data.task_id)
    .eq("user_id", userId)
    .eq("status", "in_progress")
    .select("id, talent_id, resource_id")
    .maybeSingle();

  if (error || !task) {
    redirect("/tasks?error=该任务已不存在或不再处于执行中");
  }

  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/tasks");
  if (task.talent_id) revalidatePath(`/talents/${task.talent_id}`);
  if (task.resource_id) revalidatePath(`/resources/${task.resource_id}`);
  redirect("/tasks?notice=recovered");
}

function taskRedirect(returnTo: "dashboard" | "talent" | "tasks" | "work", talentId: string, notice?: string) {
  if (returnTo === "work") {
    redirect(notice ? `/work?notice=task-${notice}` : "/work?error=任务处理失败，请刷新后重试");
  }
  if (returnTo === "dashboard") {
    redirect(notice ? `/dashboard?notice=task-${notice}` : "/dashboard?error=任务处理失败，请刷新后重试");
  }
  const path = returnTo === "talent" ? `/talents/${talentId}` : "/tasks";
  redirect(notice ? `${path}?taskNotice=${notice}` : path);
}

export async function createTask(formData: FormData) {
  const input = createTaskSchema.safeParse({
    talent_id: formData.get("talent_id"),
    task_type: formData.get("task_type"),
    due_at: formData.get("due_at"),
    notes: formData.get("notes"),
  });

  if (!input.success) {
    const talentId = z.uuid().safeParse(formData.get("talent_id"));
    const message = input.error.issues[0]?.message ?? "请检查任务信息";
    if (!talentId.success) redirect("/talents");
    redirect(
      `/talents/${talentId.data}?${new URLSearchParams({ taskError: message })}`,
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { error } = await supabase.from("tasks").insert({
    user_id: userId,
    talent_id: input.data.talent_id,
    task_type: input.data.task_type,
    due_at: input.data.due_at.toISOString(),
    notes: input.data.notes,
  });

  if (error) {
    redirect(
      `/talents/${input.data.talent_id}?${new URLSearchParams({ taskError: "任务创建失败，请稍后重试" })}`,
    );
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath(`/talents/${input.data.talent_id}`);
  redirect(`/talents/${input.data.talent_id}?taskNotice=created`);
}

export async function completeTask(formData: FormData) {
  const input = taskMutationSchema.safeParse({
    task_id: formData.get("task_id"),
    talent_id: formData.get("talent_id"),
    return_to: formData.get("return_to"),
  });

  if (!input.success) redirect("/tasks");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase.rpc("complete_task_and_record_follow_up", {
    p_task_id: input.data.task_id,
    p_talent_id: input.data.talent_id,
  });

  if (error || !data?.[0]?.follow_up_record_id) {
    taskRedirect(input.data.return_to, input.data.talent_id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/tasks");
  revalidatePath(`/talents/${input.data.talent_id}`);
  taskRedirect(input.data.return_to, input.data.talent_id, "completed");
}

export async function cancelTask(formData: FormData) {
  const input = taskMutationSchema.safeParse({
    task_id: formData.get("task_id"),
    talent_id: formData.get("talent_id"),
    return_to: formData.get("return_to"),
  });

  if (!input.success) redirect("/tasks");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("tasks")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", input.data.task_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    taskRedirect(input.data.return_to, input.data.talent_id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/tasks");
  revalidatePath(`/talents/${input.data.talent_id}`);
  taskRedirect(input.data.return_to, input.data.talent_id, "cancelled");
}
