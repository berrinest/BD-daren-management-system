"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createTalentSchema } from "@/lib/validations";

function redirectWithError(message: string): never {
  redirect(`/talents/new?${new URLSearchParams({ error: message }).toString()}`);
}

export async function createTalent(formData: FormData) {
  const input = createTalentSchema.safeParse({
    nickname: formData.get("nickname"),
    primary_platform: formData.get("primary_platform"),
    platform_account: formData.get("platform_account"),
    profile_url: formData.get("profile_url"),
    wechat: formData.get("wechat"),
    follower_count: formData.get("follower_count"),
    tags: formData.get("tags"),
    priority: formData.get("priority"),
    stage: formData.get("stage"),
    notes: formData.get("notes"),
  });

  if (!input.success) redirectWithError(input.error.issues[0]?.message ?? "请检查达人信息");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talents")
    .insert({ ...input.data, user_id: userId })
    .select("id")
    .single();

  if (error || !data) redirectWithError("达人创建失败，请稍后重试");

  revalidatePath("/talents");
  redirect(`/talents/${data.id}`);
}
