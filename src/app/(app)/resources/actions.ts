"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { convertTalentResourceSchema, createTalentResourceSchema } from "@/lib/validations";

export async function createTalentResource(formData: FormData) {
  const input = createTalentResourceSchema.safeParse(Object.fromEntries(formData));
  if (!input.success) redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "请检查资源信息")}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("talent_resources").insert({ ...input.data, user_id: userId });
  if (error) redirect("/resources?error=资源录入失败，请稍后重试");

  revalidatePath("/resources");
  redirect("/resources?notice=created");
}

export async function convertTalentResource(formData: FormData) {
  const input = convertTalentResourceSchema.safeParse({ resource_id: formData.get("resource_id") });
  if (!input.success) redirect("/resources?error=资源信息无效");

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login");

  const { data: talentId, error } = await supabase.rpc("convert_talent_resource", { p_resource_id: input.data.resource_id });
  if (error || !talentId) redirect("/resources?error=资源已转换或当前不可用");

  revalidatePath("/resources");
  revalidatePath("/talents");
  redirect(`/talents/${talentId}?resourceNotice=converted`);
}
