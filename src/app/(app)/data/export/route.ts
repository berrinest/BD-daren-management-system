import * as XLSX from "xlsx";

import { TALENT_CATEGORIES, TALENT_PLATFORM_LABELS, TALENT_PLATFORMS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS, TALENT_STAGES, TALENT_STAGE_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type Talent = Tables<"talents">;

function allowed<T extends readonly string[]>(value: string | null, options: T) {
  return options.find((option) => option === value);
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return new Response("登录已失效", { status: 401 });

  const params = new URL(request.url).searchParams;
  const platform = allowed(params.get("platform"), TALENT_PLATFORMS);
  const category = allowed(params.get("category"), TALENT_CATEGORIES);
  const priority = allowed(params.get("priority"), TALENT_PRIORITIES);
  const stage = allowed(params.get("stage"), TALENT_STAGES);
  const archived = params.get("archived") === "all" || params.get("archived") === "archived" ? params.get("archived") : "active";
  const pageSize = 1000;
  const talents: Talent[] = [];

  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from("talents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);
    if (platform) query = query.eq("primary_platform", platform);
    if (category) query = query.contains("tags", [category]);
    if (priority) query = query.eq("priority", priority);
    if (stage) query = query.eq("stage", stage);
    if (archived === "active") query = query.is("archived_at", null);
    if (archived === "archived") query = query.not("archived_at", "is", null);

    const { data, error } = await query;
    if (error) return new Response("导出查询失败，请稍后重试", { status: 500 });
    talents.push(...(data ?? []));
    if ((data?.length ?? 0) < pageSize) break;
  }

  const rows = talents.map((talent) => ({
    "达人昵称": talent.nickname,
    "主要平台": TALENT_PLATFORM_LABELS[talent.primary_platform as keyof typeof TALENT_PLATFORM_LABELS] ?? talent.primary_platform,
    "平台账号": talent.platform_account ?? "",
    "主页链接": talent.profile_url ?? "",
    "微信号": talent.wechat ?? "",
    "粉丝数量": talent.follower_count ?? "",
    "赛道": talent.tags.join("、"),
    "优先级": TALENT_PRIORITY_LABELS[talent.priority as keyof typeof TALENT_PRIORITY_LABELS] ?? talent.priority,
    "当前阶段": TALENT_STAGE_LABELS[talent.stage as keyof typeof TALENT_STAGE_LABELS] ?? talent.stage,
    "备注": talent.notes ?? "",
    "创建时间": talent.created_at,
    "归档时间": talent.archived_at ?? "",
  }));
  const sheet = XLSX.utils.json_to_sheet(rows, { header: ["达人昵称", "主要平台", "平台账号", "主页链接", "微信号", "粉丝数量", "赛道", "优先级", "当前阶段", "备注", "创建时间", "归档时间"] });
  sheet["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 45 }, { wch: 20 }, { wch: 14 }, { wch: 16 }, { wch: 12 }, { wch: 14 }, { wch: 35 }, { wch: 24 }, { wch: 24 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "达人数据");
  const output = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const date = new Intl.DateTimeFormat("zh-CN", { day: "2-digit", month: "2-digit", timeZone: "Asia/Shanghai", year: "numeric" }).format(new Date()).replaceAll("/", "-");

  return new Response(output, {
    headers: {
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(`达人数据-${date}.xlsx`)}`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
