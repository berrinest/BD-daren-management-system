export const TALENT_STAGES = [
  "not_contacted",
  "applied",
  "connected",
  "replied",
  "interested",
  "quoting",
  "confirmed",
  "completed",
  "rejected",
] as const;

export const TALENT_STAGE_LABELS: Record<(typeof TALENT_STAGES)[number], string> = {
  not_contacted: "未联系",
  applied: "已申请",
  connected: "已通过",
  replied: "已回复",
  interested: "有意向",
  quoting: "报价中",
  confirmed: "合作确认",
  completed: "已完成",
  rejected: "已拒绝",
};

export const TALENT_PRIORITIES = ["high", "normal", "paused"] as const;

export const TALENT_PRIORITY_LABELS: Record<
  (typeof TALENT_PRIORITIES)[number],
  string
> = {
  high: "高价值",
  normal: "普通",
  paused: "暂不跟进",
};

export const TALENT_PLATFORMS = [
  "douyin",
  "xiaohongshu",
  "kuaishou",
  "weibo",
  "bilibili",
  "other",
] as const;

export const TALENT_PLATFORM_LABELS: Record<
  (typeof TALENT_PLATFORMS)[number],
  string
> = {
  douyin: "抖音",
  xiaohongshu: "小红书",
  kuaishou: "快手",
  weibo: "微博",
  bilibili: "B站",
  other: "其他",
};

export function getTalentStageLabel(value: string) {
  return TALENT_STAGE_LABELS[value as keyof typeof TALENT_STAGE_LABELS] ?? value;
}

export function getTalentPriorityLabel(value: string) {
  return TALENT_PRIORITY_LABELS[value as keyof typeof TALENT_PRIORITY_LABELS] ?? value;
}

export function getTalentPlatformLabel(value: string) {
  return TALENT_PLATFORM_LABELS[value as keyof typeof TALENT_PLATFORM_LABELS] ?? value;
}
