export const RESOURCE_PROCESSING_STATUSES = [
  "pending_add",
  "attempted_add",
  "waiting_acceptance",
  "contacted",
  "paused",
] as const;

export type ResourceProcessingStatus =
  (typeof RESOURCE_PROCESSING_STATUSES)[number];

export const RESOURCE_PROCESSING_STATUS_LABELS: Record<
  ResourceProcessingStatus,
  string
> = {
  pending_add: "待添加",
  attempted_add: "已尝试添加",
  waiting_acceptance: "等待通过",
  contacted: "已联系",
  paused: "暂不处理",
};

export function getResourceProcessingStatusLabel(value: string) {
  return RESOURCE_PROCESSING_STATUS_LABELS[
    value as ResourceProcessingStatus
  ] ?? value;
}
