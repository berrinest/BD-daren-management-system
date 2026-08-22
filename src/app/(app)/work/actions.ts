"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getShanghaiTomorrowAtTen } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";
import { deferWorkItemSchema } from "@/lib/validations";

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
