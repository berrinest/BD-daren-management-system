export type TalentLevel = "A" | "B" | "C";

const allowedVariables = ["nickname", "platform", "account"] as const;
const variablePattern = /\{([^{}]+)\}/g;

export function findUnsupportedTemplateVariables(template: string) {
  const unsupported = new Set<string>();
  for (const match of template.matchAll(variablePattern)) {
    const variable = match[1];
    if (!allowedVariables.includes(variable as (typeof allowedVariables)[number])) {
      unsupported.add(`{${variable}}`);
    }
  }
  const withoutCompleteVariables = template.replace(variablePattern, "");
  if (withoutCompleteVariables.includes("{") || withoutCompleteVariables.includes("}")) {
    unsupported.add("不完整的变量占位符");
  }
  return [...unsupported];
}

export function renderWechatTemplate(
  template: string,
  values: { account: string; nickname: string; platform: string },
) {
  return allowedVariables.reduce(
    (value, variable) => value.replaceAll(`{${variable}}`, values[variable]),
    template,
  );
}

type TalentInput = {
  nickname: string;
  platformAccount: string | null;
  platform: string;
  talentLevel: string;
  wechat: string | null;
};

type TemplateInput = {
  enabled: boolean;
  greetingMessage: string;
} | null;

export type WechatExecutionSnapshot = {
  expectedNickname: string;
  greetingMessage: string;
  remark: string;
  talentLevel: TalentLevel;
  wechatId: string;
};

export function isTalentLevel(value: string): value is TalentLevel {
  return value === "A" || value === "B" || value === "C";
}

export function prepareWechatExecutionSnapshot(
  talent: TalentInput,
  template: TemplateInput,
): { error: string; ok: false } | { ok: true; snapshot: WechatExecutionSnapshot } {
  const nickname = talent.nickname.trim();
  const wechatId = talent.wechat?.trim() ?? "";
  if (!nickname) return { error: "达人昵称不能为空", ok: false };
  if (!wechatId) return { error: "请先填写达人微信号", ok: false };
  if (!isTalentLevel(talent.talentLevel)) {
    return { error: "请先设置有效的达人等级", ok: false };
  }
  if (!template?.enabled) {
    return {
      error: `请先配置并启用 ${talent.talentLevel} 类微信招呼语`,
      ok: false,
    };
  }

  const values = {
    account: talent.platformAccount ?? "",
    nickname,
    platform: talent.platform,
  };
  const greetingMessage = renderWechatTemplate(template.greetingMessage, values).trim();
  const remark = nickname;
  if (!greetingMessage || greetingMessage.length > 500) {
    return { error: "招呼语渲染后为空或超过 500 个字符", ok: false };
  }
  if (!remark || remark.length > 100) {
    return { error: "达人昵称超过微信备注允许的 100 个字符", ok: false };
  }

  return {
    ok: true,
    snapshot: {
      expectedNickname: nickname,
      greetingMessage,
      remark,
      talentLevel: talent.talentLevel,
      wechatId,
    },
  };
}
