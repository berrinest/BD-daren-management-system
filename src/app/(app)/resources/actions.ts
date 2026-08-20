"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getShanghaiSecondDayAtTen } from "@/lib/formatters/date";
import { bulkConvertTalentResourcesSchema, bulkDeleteTalentResourcesSchema, bulkUpdateTalentResourcePrioritySchema, convertTalentResourceSchema, createResourceContactRecordSchema, createTalentResourceSchema, updateTalentResourcePrioritySchema, updateTalentResourceProcessingStatusSchema } from "@/lib/validations";

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

export async function updateTalentResourceProcessingStatus(formData: FormData) {
  const input = updateTalentResourceProcessingStatusSchema.safeParse({
    next_action_at: formData.get("next_action_at"),
    processing_status: formData.get("processing_status"),
    resource_id: formData.get("resource_id"),
  });
  if (!input.success) redirect("/resources?error=资源处理状态无效");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talent_resources")
    .update({
      processing_status: input.data.processing_status,
      ...(input.data.next_action_at !== undefined
        ? { next_action_at: input.data.next_action_at?.toISOString() ?? null }
        : {}),
    })
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
  redirect(`/resources/${input.data.resource_id}?notice=status-updated`);
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

export async function bulkDeleteTalentResources(formData: FormData) {
  const input = bulkDeleteTalentResourcesSchema.safeParse({ resource_ids: formData.getAll("resource_ids") });
  if (!input.success) redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "批量删除信息无效")}`);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data, error } = await supabase
    .from("talent_resources")
    .delete()
    .in("id", input.data.resource_ids)
    .eq("user_id", userId)
    .eq("status", "new")
    .select("id");
  if (error) redirect("/resources?error=批量删除失败，请稍后重试");

  const success = data?.length ?? 0;
  const failed = input.data.resource_ids.length - success;
  revalidatePath("/dashboard");
  revalidatePath("/resources");
  revalidatePath("/resources/process");
  redirect(`/resources?notice=batch-deleted&success=${success}&failed=${failed}`);
}

export async function createResourceContactRecord(formData: FormData) {
  const continueProcessing = formData.get("continue_processing") === "1";
  const processingDone = formData.get("processing_done") === "1";
  const processingScope = formData.get("processing_scope") === "today" ? "today" : undefined;
  const nextResourceId = convertTalentResourceSchema.safeParse({ resource_id: formData.get("next_resource_id") });
  const input = createResourceContactRecordSchema.safeParse({
    resource_id: formData.get("resource_id"),
    occurred_at: formData.get("occurred_at"),
    method: formData.get("method"),
    result: formData.get("result"),
    notes: formData.get("notes"),
    next_action_at: formData.get("next_action_at"),
  });
  const fallbackId = convertTalentResourceSchema.safeParse({ resource_id: formData.get("resource_id") });
  if (!input.success) {
    const error = input.error.issues[0]?.message ?? "请检查联系记录";
    if (continueProcessing) {
      const params = new URLSearchParams({ error });
      if (fallbackId.success) params.set("resource", fallbackId.data.resource_id);
      if (processingScope) params.set("scope", processingScope);
      redirect(`/resources/process?${params}`);
    }
    const fallbackPath = fallbackId.success ? `/resources/${fallbackId.data.resource_id}` : "/resources";
    redirect(`${fallbackPath}?error=${encodeURIComponent(error)}`);
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: resource } = await supabase
    .from("talent_resources")
    .select("id")
    .eq("id", input.data.resource_id)
    .eq("user_id", userId)
    .eq("status", "new")
    .maybeSingle();
  if (!resource) {
    if (continueProcessing) {
      const params = new URLSearchParams({ error: "资源已转换或当前不可用" });
      if (processingScope) params.set("scope", processingScope);
      redirect(`/resources/process?${params}`);
    }
    redirect(`/resources/${input.data.resource_id}?error=资源已转换或当前不可用`);
  }

  const recommendedNextActionAt = input.data.result === "rejected"
    ? null
    : getShanghaiSecondDayAtTen(input.data.occurred_at).toISOString();
  const nextActionAt = input.data.next_action_at === undefined
    ? recommendedNextActionAt
    : input.data.next_action_at?.toISOString() ?? null;
  const { data: rpcResult, error } = await supabase.rpc("record_resource_contact_and_maybe_convert", {
    p_resource_id: input.data.resource_id,
    p_occurred_at: input.data.occurred_at.toISOString(),
    p_method: input.data.method,
    p_result: input.data.result,
    p_notes: input.data.notes ?? undefined,
    p_next_action_at: nextActionAt ?? undefined,
  });
  const result = rpcResult?.[0];
  if (error || !result?.resource_contact_record_id) {
    if (continueProcessing) {
      const params = new URLSearchParams({ error: "联系处理失败，未产生任何数据", resource: input.data.resource_id });
      if (processingScope) params.set("scope", processingScope);
      redirect(`/resources/process?${params}`);
    }
    redirect(`/resources/${input.data.resource_id}?error=联系处理失败，未产生任何数据`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/resources");
  revalidatePath("/resources/process");
  revalidatePath("/talents");
  revalidatePath(`/resources/${input.data.resource_id}`);
  const notice = new URLSearchParams({ notice: "contact-created" });
  notice.set("statusUpdated", "1");
  if (result.converted_talent_id) notice.set("autoConverted", "1");
  if (continueProcessing) {
    if (nextResourceId.success) notice.set("resource", nextResourceId.data.resource_id);
    else if (processingDone) notice.set("completed", "1");
    if (processingScope) notice.set("scope", processingScope);
    redirect(`/resources/process?${notice}`);
  }
  if (result.converted_talent_id) {
    revalidatePath(`/talents/${result.converted_talent_id}`);
    redirect(`/talents/${result.converted_talent_id}?resourceNotice=auto-converted`);
  }
  redirect(`/resources/${input.data.resource_id}?${notice}`);
}
