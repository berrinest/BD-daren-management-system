import { TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PLATFORM_LABELS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS } from "@/lib/constants";
import { normalizeProfileUrl } from "@/lib/resources/identity";

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

function splitSemicolonLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if ((character === ";" || character === "；") && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseFollowerCount(value: string) {
  if (!value) return null;
  const normalized = value.trim().replaceAll(",", "").toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(w|万|k|千)?$/i);
  if (!match) return Number.NaN;
  const amount = Number(match[1]);
  const multiplier = match[2] === "w" || match[2] === "万" ? 10_000 : match[2] === "k" || match[2] === "千" ? 1_000 : 1;
  return amount * multiplier;
}

export function parseBatchResources(text: string): ParsedBatchRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return lines.slice(0, 101).map((line, index) => {
    const cells = splitSemicolonLine(line);
    const [nickname = "", platformRaw = "", platformAccount = "", wechat = "", profileUrl = "", followerRaw = "", categoryRaw = "其他", priorityRaw = "normal", source = "", ...noteParts] = cells;
    const category = categoryRaw || "其他";
    const notes = noteParts.join("; ");
    const primaryPlatform = platformAliases.get(platformRaw.toLowerCase()) ?? "";
    const priority = priorityAliases.get((priorityRaw || "normal").toLowerCase()) ?? "";
    const followerCount = parseFollowerCount(followerRaw);
    const errors: string[] = [];
    if (cells.length < 2) errors.push("请使用分号分隔字段");
    if (!nickname) errors.push("缺少昵称");
    if (!primaryPlatform) errors.push("平台无效");
    if (!TALENT_CATEGORIES.includes(category as (typeof TALENT_CATEGORIES)[number])) errors.push("赛道无效");
    if (!priority) errors.push("优先级无效");
    if (followerCount !== null && (!Number.isSafeInteger(followerCount) || followerCount < 0)) errors.push("粉丝数无效");
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
        profile_url: profileUrl ? normalizeProfileUrl(profileUrl) : null,
        source: source || null,
        wechat: wechat || null,
      },
      rowNumber: index + 1,
    };
  });
}
