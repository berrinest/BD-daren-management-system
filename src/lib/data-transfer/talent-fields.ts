export const TALENT_IMPORT_FIELDS = [
  { aliases: ["昵称", "达人昵称", "nickname", "name"], key: "nickname", label: "达人昵称", required: true },
  { aliases: ["平台", "主要平台", "primaryplatform", "platform"], key: "primary_platform", label: "主要平台", required: true },
  { aliases: ["平台账号", "账号", "platformaccount", "account"], key: "platform_account", label: "平台账号", required: false },
  { aliases: ["主页链接", "主页", "profileurl", "homepage", "url"], key: "profile_url", label: "主页链接", required: false },
  { aliases: ["微信", "微信号", "wechat", "weixin"], key: "wechat", label: "微信号", required: false },
  { aliases: ["粉丝", "粉丝数", "粉丝数量", "followers", "followercount"], key: "follower_count", label: "粉丝数量", required: false },
  { aliases: ["赛道", "赛道分类", "分类", "category", "tags"], key: "tags", label: "赛道", required: true },
  { aliases: ["达人等级", "等级", "talentlevel", "level"], key: "talent_level", label: "达人等级", required: false },
  { aliases: ["阶段", "当前阶段", "stage", "status"], key: "stage", label: "当前阶段", required: false },
  { aliases: ["备注", "联系备注", "notes", "remark"], key: "notes", label: "备注", required: false },
] as const;

export type TalentImportField = (typeof TALENT_IMPORT_FIELDS)[number]["key"];

export function normalizeImportHeader(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase().replace(/[\s_-]+/gu, "");
}
