export const RESOURCE_PROCESSING_STATUSES = [
  "pending_add",
  "attempted_add",
  "waiting_acceptance",
  "contacted",
  "paused",
] as const;

export type ResourceProcessingStatus =
  (typeof RESOURCE_PROCESSING_STATUSES)[number];

export const RESOURCE_SOURCE_TYPES = [
  "platform_search",
  "platform_recommendation",
  "creator_list",
  "referral",
  "agency",
  "manual",
  "other",
] as const;

export const RESOURCE_SOURCE_TYPE_LABELS: Record<(typeof RESOURCE_SOURCE_TYPES)[number], string> = {
  platform_search: "平台搜索",
  platform_recommendation: "平台推荐",
  creator_list: "达人榜单",
  referral: "他人推荐",
  agency: "机构资源",
  manual: "手动整理",
  other: "其他",
};

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

export const RESOURCE_CONTACT_METHODS = [
  "wechat",
  "phone",
  "email",
  "platform_message",
  "other",
] as const;

export const RESOURCE_CONTACT_METHOD_LABELS: Record<
  (typeof RESOURCE_CONTACT_METHODS)[number],
  string
> = {
  wechat: "微信",
  phone: "电话",
  email: "邮件",
  platform_message: "平台私信",
  other: "其他",
};

export const RESOURCE_CONTACT_RESULTS = [
  "friend_request",
  "reapplication",
  "accepted",
  "replied",
  "no_response",
  "rejected",
  "other",
] as const;

export const RESOURCE_CONTACT_RESULT_LABELS: Record<
  (typeof RESOURCE_CONTACT_RESULTS)[number],
  string
> = {
  friend_request: "首次申请",
  reapplication: "再次申请",
  accepted: "已通过",
  rejected: "已拒绝",
  replied: "已回复",
  no_response: "暂无回应",
  other: "其他",
};

export function getResourceContactMethodLabel(value: string) {
  return RESOURCE_CONTACT_METHOD_LABELS[
    value as keyof typeof RESOURCE_CONTACT_METHOD_LABELS
  ] ?? value;
}

export function getResourceContactResultLabel(value: string) {
  return RESOURCE_CONTACT_RESULT_LABELS[
    value as keyof typeof RESOURCE_CONTACT_RESULT_LABELS
  ] ?? value;
}
