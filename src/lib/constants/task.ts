export const TASK_TYPES = [
  "follow_up",
  "quote_follow_up",
  "cooperation",
  "other",
] as const;

export const TASK_TYPE_LABELS: Record<(typeof TASK_TYPES)[number], string> = {
  follow_up: "重新联系",
  quote_follow_up: "报价跟进",
  cooperation: "合作推进",
  other: "其他任务",
};
