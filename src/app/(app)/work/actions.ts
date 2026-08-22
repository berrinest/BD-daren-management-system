"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getShanghaiTomorrowAtTen } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";
import {
  completeWorkTaskWithResultSchema,
  deferWorkItemSchema,
} from "@/lib/validations";

export async function completeWorkTaskWithResult(formData: FormData) {
  const input = completeWorkTaskWithResultSchema.safeParse({
    task_id: formData.get("task_id"),
    talent_id: formData.get("talent_id"),
    method: formData.get("method"),
    result: formData.get("result"),
    notes: formData.get("notes") || undefined,
  });
  if (!input.success) redirect("/work?error=请选择有效的跟进结果");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", input.data.task_id)
    .eq("talent_id", input.data.talent_id)
    .eq("user_id", userId)
    .eq("status", "pending")
    .maybeSingle();

  if (taskError || !task) {
    redirect("/work?error=该任务已不存在或已处理，请刷新后重试");
  }

  const { data, error } = await supabase.rpc(
    "record_follow_up_and_schedule_next",
    {
      p_talent_id: input.data.talent_id,
      p_task_id: input.data.task_id,
      p_occurred_at: new Date().toISOString(),
      p_method: input.data.method,
      p_result: input.data.result,
      p_notes: input.data.notes,
    },
  );

  if (error || !data?.[0]?.follow_up_record_id || !data[0].completed_task_id) {
    redirect("/work?error=任务处理失败，请稍后重试");
  }

  revalidatePath("/dashboard");
  revalidatePath("/work");
  revalidatePath("/tasks");
  revalidatePath("/talents");
  revalidatePath(`/talents/${input.data.talent_id}`);
  redirect("/work?notice=task-result-recorded");
}

export async function deferWorkItem(formData: FormData) {
  const input = deferWorkItemSchema.safeParse({
    item_id: formData.get("item_id"),
    item_kind: formData.get("item_kind"),
  });
  if (!input.success) redirect("/work?error=当前事项信息无效，请刷新后重试");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const deferredUntil = getShanghaiTomorrowAtTen().toISOString();
  const isTask = input.data.item_kind === "talent_task" || input.data.item_kind === "resource_task";
  const result = isTask
    ? await supabase
      .from("tasks")
      .update({ due_at: deferredUntil })
      .eq("id", input.data.item_id)
      .eq("user_id", userId)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()
    : await supabase
      .from("talent_resources")
      .update({ next_action_at: deferredUntil })
      .eq("id", input.data.item_id)
      .eq("user_id", userId)
      .eq("status", "new")
      .select("id")
      .maybeSingle();

  if (result.error || !result.data) redirect("/work?error=该事项已不存在或已处理，请刷新后重试");

  revalidatePath("/dashboard");
  revalidatePath("/work");
  if (isTask) {
    revalidatePath("/tasks");
  } else {
    revalidatePath("/resources");
    revalidatePath(`/resources/${input.data.item_id}`);
  }
  redirect("/work?notice=deferred");
}
