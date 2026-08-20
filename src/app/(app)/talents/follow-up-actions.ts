"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { recordFollowUpAndScheduleNextSchema } from "@/lib/validations";

export async function recordFollowUpAndScheduleNext(formData: FormData) {
  const input = recordFollowUpAndScheduleNextSchema.safeParse({
    talent_id: formData.get("talent_id"),
    occurred_at: formData.get("occurred_at"),
    method: formData.get("method"),
    result: formData.get("result"),
    notes: formData.get("notes"),
    task_id: formData.get("task_id"),
    complete_current_task: formData.get("complete_current_task"),
    next_stage: formData.get("next_stage"),
    next_task_due_at: formData.get("next_task_due_at"),
    next_task_type: formData.get("next_task_type"),
    next_task_notes: formData.get("next_task_notes"),
    return_to: formData.get("return_to"),
  });

  if (!input.success) {
    const talentId = z.uuid().safeParse(formData.get("talent_id"));
    const message = input.error.issues[0]?.message ?? "请检查跟进记录";
    if (!talentId.success) redirect("/talents");
    redirect(
      `/talents/${talentId.data}?${new URLSearchParams({ followUpError: message })}`,
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const talentId = input.data.talent_id;
  const { error } = await supabase.rpc("record_follow_up_and_schedule_next", {
    p_talent_id: talentId,
    p_occurred_at: input.data.occurred_at.toISOString(),
    p_method: input.data.method,
    p_result: input.data.result,
    p_next_task_type: input.data.next_task_type,
    ...(input.data.notes ? { p_notes: input.data.notes } : {}),
    ...(input.data.complete_current_task && input.data.task_id
      ? { p_task_id: input.data.task_id }
      : {}),
    ...(input.data.next_stage ? { p_next_stage: input.data.next_stage } : {}),
    ...(input.data.next_task_due_at
      ? { p_next_task_due_at: input.data.next_task_due_at.toISOString() }
      : {}),
    ...(input.data.next_task_notes
      ? { p_next_task_notes: input.data.next_task_notes }
      : {}),
  });

  if (error) {
    const errorParams = new URLSearchParams({
      followUpError: "跟进处理失败，请检查当前任务状态后重试",
    });
    if (input.data.return_to === "dashboard") {
      errorParams.set("returnTo", "dashboard");
    }
    redirect(
      `/talents/${talentId}?${errorParams}`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/talents");
  revalidatePath(`/talents/${talentId}`);
  const notice = new URLSearchParams({ followUpNotice: "created" });
  if (input.data.complete_current_task && input.data.task_id) {
    notice.set("completedTask", "1");
  }
  if (input.data.next_task_due_at) notice.set("nextTask", "1");
  if (input.data.next_stage) notice.set("updatedStage", "1");
  if (input.data.return_to === "dashboard") {
    notice.set("returnTo", "dashboard");
  }
  redirect(`/talents/${talentId}?${notice}`);
}
