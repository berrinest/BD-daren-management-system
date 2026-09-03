"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createTalentSchema } from "@/lib/validations";

const talentIdSchema = z.uuid();

function redirectWithError(pathname: string, message: string): never {
  redirect(`${pathname}?${new URLSearchParams({ error: message }).toString()}`);
}

function parseTalentFormData(formData: FormData) {
  return createTalentSchema.safeParse({
    nickname: formData.get("nickname"),
    primary_platform: formData.get("primary_platform"),
    platform_account: formData.get("platform_account"),
    profile_url: formData.get("profile_url"),
    wechat: formData.get("wechat"),
    follower_count: formData.get("follower_count"),
    talent_level: formData.get("talent_level"),
    tags: formData.get("tags"),
    stage: formData.get("stage"),
    notes: formData.get("notes"),
  });
}

export async function createTalent(formData: FormData) {
  const input = parseTalentFormData(formData);

  if (!input.success) {
    redirectWithError(
      "/talents/new",
      input.error.issues[0]?.message ?? "请检查达人信息",
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talents")
    .insert({ ...input.data, user_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    redirectWithError("/talents/new", "达人创建失败，请稍后重试");
  }

  revalidatePath("/talents");
  redirect(`/talents/${data.id}`);
}

export async function updateTalent(formData: FormData) {
  const talentId = talentIdSchema.safeParse(formData.get("talent_id"));

  if (!talentId.success) redirect("/talents");

  const input = parseTalentFormData(formData);

  if (!input.success) {
    redirectWithError(
      `/talents/${talentId.data}/edit`,
      input.error.issues[0]?.message ?? "请检查达人信息",
    );
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talents")
    .update(input.data)
    .eq("id", talentId.data)
    .eq("user_id", userId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectWithError(
      `/talents/${talentId.data}/edit`,
      "达人更新失败，请稍后重试",
    );
  }

  revalidatePath("/talents");
  revalidatePath(`/talents/${talentId.data}`);
  redirect(`/talents/${talentId.data}`);
}

export async function archiveTalent(formData: FormData) {
  const talentId = talentIdSchema.safeParse(formData.get("talent_id"));

  if (!talentId.success) redirect("/talents");

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talents")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", talentId.data)
    .eq("user_id", userId)
    .is("archived_at", null)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirectWithError(`/talents/${talentId.data}`, "达人归档失败，请稍后重试");
  }

  revalidatePath("/talents");
  revalidatePath(`/talents/${talentId.data}`);
  redirect("/talents?notice=archived");
}
