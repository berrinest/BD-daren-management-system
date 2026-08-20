export const FOLLOW_UP_METHODS = [
  "wechat",
  "phone",
  "email",
  "platform_message",
  "other",
] as const;

export const FOLLOW_UP_METHOD_LABELS: Record<
  (typeof FOLLOW_UP_METHODS)[number],
  string
> = {
  wechat: "微信",
  phone: "电话",
  email: "邮件",
  platform_message: "平台私信",
  other: "其他",
};

export const FOLLOW_UP_RESULTS = [
  "first_application",
  "reapplication",
  "accepted",
  "replied",
  "no_response",
  "interested",
  "quote_sent",
  "quote_accepted",
  "quote_rejected",
  "cooperation",
  "rejected",
  "other",
] as const;

export const FOLLOW_UP_RESULT_LABELS: Record<
  (typeof FOLLOW_UP_RESULTS)[number],
  string
> = {
  first_application: "首次申请",
  reapplication: "再次申请",
  accepted: "已通过",
  rejected: "已拒绝",
  replied: "已回复",
  interested: "有意向",
  quote_sent: "已报价",
  quote_accepted: "报价同意",
  quote_rejected: "报价不同意",
  cooperation: "达成合作",
  no_response: "未回复",
  other: "其他",
};

export function getFollowUpMethodLabel(value: string) {
  return (
    FOLLOW_UP_METHOD_LABELS[value as keyof typeof FOLLOW_UP_METHOD_LABELS] ??
    value
  );
}

export function getFollowUpResultLabel(value: string) {
  return (
    FOLLOW_UP_RESULT_LABELS[value as keyof typeof FOLLOW_UP_RESULT_LABELS] ??
    value
  );
}
