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

export const TALENT_LEVELS = ["A", "B", "C"] as const;

export const TALENT_LEVEL_LABELS: Record<
  (typeof TALENT_LEVELS)[number],
  string
> = {
  A: "A 类达人",
  B: "B 类达人",
  C: "C 类达人",
};

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

export const TALENT_CATEGORIES = [
  "生活消费类",
  "技能类",
  "娱乐情感类",
  "其它",
] as const;

// 仅用于兼容编辑历史数据；新的录入和筛选入口不再展示这些旧分类。
export const LEGACY_TALENT_CATEGORIES = [
  "美妆",
  "美食",
  "搞笑",
  "穿搭",
  "母婴",
  "生活",
  "家居",
  "数码",
  "汽车",
  "健身",
  "旅行",
  "知识",
  "游戏",
  "宠物",
  "其他",
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

export function getTalentLevelLabel(value: string) {
  return TALENT_LEVEL_LABELS[value as keyof typeof TALENT_LEVEL_LABELS] ?? value;
}
