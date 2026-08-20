"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { bulkConvertTalentResourcesSchema, bulkUpdateTalentResourcePrioritySchema, convertTalentResourceSchema, createTalentResourceSchema, updateTalentResourcePrioritySchema } from "@/lib/validations";

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

export async function updateTalentResourcePriority(formData: FormData) {
  const input = updateTalentResourcePrioritySchema.safeParse({
    priority: formData.get("priority"),
    resource_id: formData.get("resource_id"),
  });
  if (!input.success) redirect("/resources?error=快捷处理信息无效");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talent_resources")
    .update({ priority: input.data.priority })
    .eq("id", input.data.resource_id)
    .eq("user_id", userId)
    .eq("status", "new")
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect(`/resources/${input.data.resource_id}?error=资源已转换或当前不可用`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/resources");
  revalidatePath(`/resources/${input.data.resource_id}`);
  redirect(`/resources/${input.data.resource_id}?notice=priority-updated`);
}

export async function bulkUpdateTalentResourcePriority(formData: FormData) {
  const input = bulkUpdateTalentResourcePrioritySchema.safeParse({
    priority: formData.get("bulk_priority"),
    resource_ids: formData.getAll("resource_ids"),
  });
  if (!input.success) redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "批量处理信息无效")}`);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talent_resources")
    .update({ priority: input.data.priority })
    .in("id", input.data.resource_ids)
    .eq("user_id", userId)
    .eq("status", "new")
    .select("id");
  if (error) redirect("/resources?error=批量修改优先级失败，请稍后重试");

  const success = data?.length ?? 0;
  const failed = input.data.resource_ids.length - success;
  revalidatePath("/dashboard");
  revalidatePath("/resources");
  redirect(`/resources?notice=batch-priority&success=${success}&failed=${failed}`);
}

export async function bulkConvertTalentResources(formData: FormData) {
  const input = bulkConvertTalentResourcesSchema.safeParse({ resource_ids: formData.getAll("resource_ids") });
  if (!input.success) redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "批量处理信息无效")}`);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  let success = 0;
  let failed = 0;
  for (const resourceId of input.data.resource_ids) {
    const { data, error } = await supabase.rpc("convert_talent_resource", { p_resource_id: resourceId });
    if (error || !data) failed += 1;
    else success += 1;
  }

  revalidatePath("/dashboard");
  revalidatePath("/resources");
  revalidatePath("/talents");
  redirect(`/resources?notice=batch-converted&success=${success}&failed=${failed}`);
}
