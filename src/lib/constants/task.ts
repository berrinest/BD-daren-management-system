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

export const TASK_STATUSES = ["pending", "completed", "cancelled"] as const;

export const TASK_STATUS_LABELS: Record<
  (typeof TASK_STATUSES)[number],
  string
> = {
  pending: "待处理",
  completed: "已完成",
  cancelled: "已取消",
};

export function getTaskTypeLabel(value: string) {
  return TASK_TYPE_LABELS[value as keyof typeof TASK_TYPE_LABELS] ?? value;
}

export function getTaskStatusLabel(value: string) {
  return TASK_STATUS_LABELS[value as keyof typeof TASK_STATUS_LABELS] ?? value;
}
