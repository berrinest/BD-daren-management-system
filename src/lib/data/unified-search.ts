import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type UnifiedSearchResult = {
  id: string;
  kind: "resource" | "talent";
  nickname: string;
  platform: string;
  secondary: string | null;
  state: string;
};

export async function searchBdRecords(rawSearch: string) {
  const search = rawSearch.trim().slice(0, 100);
  if (!search) return [];

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const pattern = `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const [talentsResult, resourcesResult] = await Promise.all([
    supabase.from("talents").select("id, nickname, primary_platform, platform_account, wechat, stage").eq("user_id", userId).is("archived_at", null).ilike("nickname", pattern).order("updated_at", { ascending: false }).limit(6),
    supabase.from("talent_resources").select("id, nickname, primary_platform, platform_account, wechat, processing_status").eq("user_id", userId).eq("status", "new").ilike("nickname", pattern).order("updated_at", { ascending: false }).limit(6),
  ]);

  if (talentsResult.error || resourcesResult.error) throw new Error("Unified search could not be loaded");

  const results: UnifiedSearchResult[] = [
    ...(talentsResult.data ?? []).map((talent) => ({
      id: talent.id,
      kind: "talent" as const,
      nickname: talent.nickname,
      platform: talent.primary_platform,
      secondary: talent.wechat || talent.platform_account,
      state: talent.stage,
    })),
    ...(resourcesResult.data ?? []).map((resource) => ({
      id: resource.id,
      kind: "resource" as const,
      nickname: resource.nickname,
      platform: resource.primary_platform,
      secondary: resource.wechat || resource.platform_account,
      state: resource.processing_status,
    })),
  ];

  return results.sort((left, right) => left.nickname.localeCompare(right.nickname, "zh-CN"));
}
