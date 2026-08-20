import { TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PLATFORM_LABELS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS } from "@/lib/constants";

export type BatchResourceRow = {
  category: string;
  follower_count: number | null;
  nickname: string;
  notes: string | null;
  platform_account: string | null;
  primary_platform: string;
  priority: string;
  profile_url: string | null;
  source: string | null;
  wechat: string | null;
};

export type ParsedBatchRow = { errors: string[]; resource: BatchResourceRow; rowNumber: number };

const platformAliases = new Map<string, string>([
  ...TALENT_PLATFORMS.map((value) => [value.toLowerCase(), value] as const),
  ...TALENT_PLATFORMS.map((value) => [TALENT_PLATFORM_LABELS[value].toLowerCase(), value] as const),
]);
const priorityAliases = new Map<string, string>([
  ...TALENT_PRIORITIES.map((value) => [value.toLowerCase(), value] as const),
  ...TALENT_PRIORITIES.map((value) => [TALENT_PRIORITY_LABELS[value].toLowerCase(), value] as const),
]);

function splitLine(line: string) {
  if (line.includes("\t")) return line.split("\t");
  if (line.includes(",")) return line.split(",");
  return line.split(/\s+/);
}

function normalizeCells(cells: string[]) {
  const isShortFormat =
    (cells.length === 3 || cells.length === 4)
    && platformAliases.has((cells[1] ?? "").toLowerCase())
    && TALENT_CATEGORIES.includes(cells[2] as (typeof TALENT_CATEGORIES)[number])
    && (cells.length === 3 || priorityAliases.has((cells[3] ?? "").toLowerCase()));

  if (isShortFormat) {
    const [nickname = "", platform = "", category = "", priority = "normal"] = cells;
    return [nickname, platform, category, "", "", "", "", priority, "", ""];
  }

  return cells;
}

export function parseBatchResources(text: string): ParsedBatchRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 101).map((line, index) => {
    const cells = normalizeCells(splitLine(line).map((cell) => cell.trim()));
    const [nickname = "", platformRaw = "", category = "", platformAccount = "", wechat = "", profileUrl = "", followerRaw = "", priorityRaw = "normal", source = "", notes = ""] = cells;
    const primaryPlatform = platformAliases.get(platformRaw.toLowerCase()) ?? "";
    const priority = priorityAliases.get(priorityRaw.toLowerCase()) ?? "";
    const followerCount = followerRaw === "" ? null : Number(followerRaw);
    const errors: string[] = [];
    if (!nickname) errors.push("缺少昵称");
    if (!primaryPlatform) errors.push("平台无效");
    if (!TALENT_CATEGORIES.includes(category as (typeof TALENT_CATEGORIES)[number])) errors.push("赛道无效");
    if (!priority) errors.push("优先级无效");
    if (followerCount !== null && (!Number.isInteger(followerCount) || followerCount < 0)) errors.push("粉丝数无效");
    if (profileUrl && !URL.canParse(profileUrl)) errors.push("主页链接无效");
    return {
      errors,
      resource: {
        category,
        follower_count: followerCount,
        nickname,
        notes: notes || null,
        platform_account: platformAccount || null,
        primary_platform: primaryPlatform,
        priority,
        profile_url: profileUrl || null,
        source: source || null,
        wechat: wechat || null,
      },
      rowNumber: index + 1,
    };
  });
}
