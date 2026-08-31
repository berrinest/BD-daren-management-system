export const FOLLOW_UP_TASK_TYPES = [
  "follow_up",
  "quote_follow_up",
  "cooperation",
  "other",
] as const;

export const TASK_TYPES = [
  ...FOLLOW_UP_TASK_TYPES,
  "wechat_add_friend",
  "desktop_test",
] as const;

export const TASK_TYPE_LABELS: Record<(typeof TASK_TYPES)[number], string> = {
  follow_up: "重新联系",
  quote_follow_up: "报价跟进",
  cooperation: "合作推进",
  wechat_add_friend: "微信添加好友",
  desktop_test: "桌面安全测试",
  other: "其他任务",
};

export const TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const TASK_STATUS_LABELS: Record<
  (typeof TASK_STATUSES)[number],
  string
> = {
  pending: "待处理",
  in_progress: "执行中",
  completed: "已完成",
  cancelled: "已取消",
};

export function getTaskTypeLabel(value: string) {
  return TASK_TYPE_LABELS[value as keyof typeof TASK_TYPE_LABELS] ?? value;
}

export function getTaskStatusLabel(value: string) {
  return TASK_STATUS_LABELS[value as keyof typeof TASK_STATUS_LABELS] ?? value;
}

export const AGENT_EXECUTION_STATUS_LABELS: Record<string, string> = {
  claimed: "执行中",
  running: "执行中",
  ready_to_submit: "已填写申请，等待发送确认",
  safe_stop: "安全停止",
  timeout: "超时",
  failed: "执行失败",
};

export function getWechatTaskDisplayStatus(
  status: string,
  executionStatus: string | null,
) {
  if (status === "pending") return "待执行";
  return executionStatus
    ? AGENT_EXECUTION_STATUS_LABELS[executionStatus] ?? "执行中"
    : "执行中";
}
