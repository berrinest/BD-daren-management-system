"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { findResourceDuplicate, getKnownResourceIdentities, type KnownResourceIdentity } from "@/lib/resources/duplicates";
import { normalizeProfileUrl } from "@/lib/resources/identity";
import { batchImportTalentsSchema } from "@/lib/validations";

export type ImportTalentsState = {
  duplicates?: string[];
  error?: string;
  imported?: number;
  skipped?: number;
};

export async function importTalents(
  _previousState: ImportTalentsState,
  formData: FormData,
): Promise<ImportTalentsState> {
  const raw = formData.get("talents");
  if (typeof raw !== "string") return { error: "导入数据无效" };

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return { error: "导入数据无法解析，请重新选择文件" };
  }

  const input = batchImportTalentsSchema.safeParse(payload);
  if (!input.success) return { error: input.error.issues[0]?.message ?? "请检查导入数据" };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "登录已失效，请重新登录" };

  const known = await getKnownResourceIdentities(supabase, userId);
  if (!known) return { error: "重复检测失败，请稍后重试" };

  const uniqueTalents = [];
  const duplicates: string[] = [];
  for (const talent of input.data) {
    const normalized = { ...talent, profile_url: normalizeProfileUrl(talent.profile_url) };
    const duplicate = findResourceDuplicate(normalized, known);
    if (duplicate) {
      if (duplicates.length < 20) {
        duplicates.push(`${talent.nickname}：${duplicate.dimensions.join("、")}与${duplicate.existing.kind === "resource" ? "资源池" : "达人库"}“${duplicate.existing.nickname}”重复`);
      }
      continue;
    }
    uniqueTalents.push({ ...normalized, user_id: userId });
    known.push({ ...normalized, id: `import-${uniqueTalents.length}`, kind: "talent" } as KnownResourceIdentity);
  }

  if (uniqueTalents.length) {
    const { error } = await supabase.from("talents").insert(uniqueTalents);
    if (error) return { error: "批量写入失败，本次未导入任何达人" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/talents");
  revalidatePath("/data");
  return {
    duplicates,
    imported: uniqueTalents.length,
    skipped: input.data.length - uniqueTalents.length,
  };
}
