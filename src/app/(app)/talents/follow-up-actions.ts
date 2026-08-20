"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createFollowUpSchema } from "@/lib/validations";

export async function createFollowUpRecord(formData: FormData) {
  const input = createFollowUpSchema.safeParse({
    talent_id: formData.get("talent_id"),
    occurred_at: formData.get("occurred_at"),
    method: formData.get("method"),
    result: formData.get("result"),
    notes: formData.get("notes"),
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

  const { data: talent, error: talentError } = await supabase
    .from("talents")
    .select("id")
    .eq("id", input.data.talent_id)
    .eq("user_id", userId)
    .is("archived_at", null)
    .maybeSingle();

  if (talentError || !talent) redirect("/talents");

  const { error } = await supabase.from("follow_up_records").insert({
    user_id: userId,
    talent_id: talent.id,
    occurred_at: input.data.occurred_at.toISOString(),
    method: input.data.method,
    result: input.data.result,
    notes: input.data.notes,
  });

  if (error) {
    redirect(
      `/talents/${talent.id}?${new URLSearchParams({ followUpError: "跟进记录保存失败，请稍后重试" })}`,
    );
  }

  revalidatePath(`/talents/${talent.id}`);
  redirect(`/talents/${talent.id}?followUpNotice=created`);
}
