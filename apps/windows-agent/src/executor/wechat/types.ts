export const WECHAT_EXECUTOR_ACTIONS = [
  "open_wechat",
  "prepare_contact",
  "search_contact",
  "open_profile",
  "wait_user_confirm",
] as const;

export type WechatExecutorAction = (typeof WECHAT_EXECUTOR_ACTIONS)[number];

export type WechatPrepareContext = {
  signal: AbortSignal;
  taskId: string;
  wechat: string;
};

export type WechatExecutor = {
  prepare(context: WechatPrepareContext): Promise<void>;
  recordUserStep(input: {
    action: "search_contact" | "open_profile" | "wait_user_confirm";
    confirmed: boolean;
    taskId: string;
  }): Promise<void>;
};
