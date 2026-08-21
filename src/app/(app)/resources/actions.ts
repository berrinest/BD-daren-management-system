"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getShanghaiSecondDayAtTen } from "@/lib/formatters/date";
import { RESOURCE_SOURCE_TYPE_LABELS } from "@/lib/constants";
import { getResourceIdentityMatches, normalizeProfileUrl, type ResourceIdentity } from "@/lib/resources/identity";
import { batchCreateTalentResourcesSchema, bulkConvertTalentResourcesSchema, bulkDeleteTalentResourcesSchema, bulkUpdateTalentResourcePrioritySchema, convertTalentResourceSchema, createResourceContactRecordSchema, createTalentResourceSchema, resourceSourceInputSchema, updateTalentResourcePrioritySchema, updateTalentResourceProcessingStatusSchema } from "@/lib/validations";

export type BatchCreateResourcesState = {
  duplicates?: string[];
  error?: string;
  imported?: number;
  skipped?: number;
};

type KnownIdentity = ResourceIdentity & {
  id: string;
  kind: "resource" | "talent";
};

async function getKnownIdentities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const columns = "id,nickname,primary_platform,platform_account,profile_url,wechat";
  const pageSize = 1000;
  const known: KnownIdentity[] = [];
  let offset = 0;

  while (true) {
    const [resourceResult, talentResult] = await Promise.all([
      supabase.from("talent_resources").select(columns).eq("user_id", userId).range(offset, offset + pageSize - 1),
      supabase.from("talents").select(columns).eq("user_id", userId).range(offset, offset + pageSize - 1),
    ]);
    if (resourceResult.error || talentResult.error) return null;

    const resources = resourceResult.data ?? [];
    const talents = talentResult.data ?? [];
    known.push(
      ...resources.map((item) => ({ ...item, kind: "resource" as const })),
      ...talents.map((item) => ({ ...item, kind: "talent" as const })),
    );
    if (resources.length < pageSize && talents.length < pageSize) break;
    offset += pageSize;
  }

  return known;
}

function findDuplicate(resource: ResourceIdentity, known: KnownIdentity[]) {
  for (const existing of known) {
    const dimensions = getResourceIdentityMatches(resource, existing);
    if (dimensions.length) return { dimensions, existing };
  }
  return null;
}

export async function batchCreateTalentResources(
  _previousState: BatchCreateResourcesState,
  formData: FormData,
): Promise<BatchCreateResourcesState> {
  const raw = formData.get("resources");
  if (typeof raw !== "string") return { error: "批量资源数据无效" };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "批量资源数据无法解析" };
  }
  const input = batchCreateTalentResourcesSchema.safeParse(parsed);
  if (!input.success) return { error: input.error.issues[0]?.message ?? "请检查批量资源" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const normalizedResources = input.data.map((resource) => ({ ...resource, profile_url: normalizeProfileUrl(resource.profile_url) }));
  const known = await getKnownIdentities(supabase, userId);
  if (!known) return { error: "重复检测失败，请稍后重试" };

  const uniqueResources = [];
  const duplicates: string[] = [];
  let skipped = 0;
  for (const resource of normalizedResources) {
    const duplicate = findDuplicate(resource, known);
    if (duplicate) {
      skipped += 1;
      if (duplicates.length < 10) {
        duplicates.push(`${resource.nickname}：${duplicate.dimensions.join("、")}与${duplicate.existing.kind === "resource" ? "资源池" : "达人库"}“${duplicate.existing.nickname}”重复`);
      }
      continue;
    }
    uniqueResources.push({ ...resource, user_id: userId });
    known.push({ ...resource, id: `pending-${uniqueResources.length}`, kind: "resource" });
  }

  if (uniqueResources.length) {
    const { error } = await supabase.from("talent_resources").insert(uniqueResources);
    if (error) return { error: "批量导入失败，未写入任何资源" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/resources");
  return { duplicates, imported: uniqueResources.length, skipped };
}

export async function createTalentResource(formData: FormData) {
  const sourceInput = resourceSourceInputSchema.safeParse({
    source_type: formData.get("source_type"),
    source_detail: formData.get("source_detail"),
    source_url: formData.get("source_url"),
  });
  if (!sourceInput.success) redirect(`/resources?error=${encodeURIComponent(sourceInput.error.issues[0]?.message ?? "请检查来源信息")}`);
  const source = [
    RESOURCE_SOURCE_TYPE_LABELS[sourceInput.data.source_type],
    sourceInput.data.source_detail,
    sourceInput.data.source_url,
  ].filter(Boolean).join(" · ");
  const input = createTalentResourceSchema.safeParse({
    ...Object.fromEntries(formData),
    profile_url: normalizeProfileUrl(String(formData.get("profile_url") ?? "")),
    source,
  });
  if (!input.success) redirect(`/resources?error=${encodeURIComponent(input.error.issues[0]?.message ?? "请检查资源信息")}`);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");

  const known = await getKnownIdentities(supabase, userId);
  if (!known) redirect("/resources?error=重复检测失败，请稍后重试");
  const duplicate = findDuplicate(input.data, known);
  if (duplicate) {
    const params = new URLSearchParams({
      duplicateFields: duplicate.dimensions.join("、"),
      duplicateId: duplicate.existing.id,
      duplicateKind: duplicate.existing.kind,
      duplicateNickname: duplicate.existing.nickname,
      error: "发现重复资源，已阻止录入",
    });
    redirect(`/resources?${params}`);
  }

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
  const parseCount = (value: FormDataEntryValue | null) => typeof value === "string" && /^\d{1,6}$/.test(value) ? Number(value) : 0;
  const processedCount = parseCount(formData.get("processed_count"));
  const totalCount = Math.max(processedCount, parseCount(formData.get("total_count")));
  const appendProgress = (params: URLSearchParams, increment = false) => {
    if (!continueProcessing) return;
    params.set("processed", String(Math.min(totalCount, processedCount + (increment ? 1 : 0))));
    params.set("total", String(totalCount));
  };
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
      appendProgress(params);
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
      appendProgress(params);
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
      appendProgress(params);
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
    appendProgress(notice, true);
    redirect(`/resources/process?${notice}`);
  }
  if (result.converted_talent_id) {
    revalidatePath(`/talents/${result.converted_talent_id}`);
    redirect(`/talents/${result.converted_talent_id}?resourceNotice=auto-converted`);
  }
  redirect(`/resources/${input.data.resource_id}?${notice}`);
}
