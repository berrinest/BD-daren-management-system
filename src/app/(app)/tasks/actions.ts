"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createTaskSchema, taskMutationSchema } from "@/lib/validations";

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
