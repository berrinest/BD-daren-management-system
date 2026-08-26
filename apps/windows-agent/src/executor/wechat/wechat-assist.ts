import { createExecutionLogWriter, type ExecutionLogWriter } from "../logger.js";
import { quotePowerShell, runPowerShell } from "../powershell.js";
import type { WechatExecutor, WechatExecutorAction, WechatPrepareContext } from "./types.js";

type PowerShellRunner = (script: string, signal: AbortSignal) => Promise<void>;

export class WechatAssistExecutor implements WechatExecutor {
  constructor(
    private readonly run: PowerShellRunner = runPowerShell,
    private readonly writeLog: ExecutionLogWriter = createExecutionLogWriter(),
    private readonly wechatPath = process.env.BD_WECHAT_PATH?.trim() || null,
  ) {}

  private async log(
    taskId: string,
    action: WechatExecutorAction,
    success: boolean,
    error: string | null = null,
  ) {
    await this.writeLog({
      action,
      error,
      success,
      task_id: taskId,
      timestamp: new Date().toISOString(),
    });
  }

  private async execute(
    taskId: string,
    action: WechatExecutorAction,
    run: () => Promise<void>,
  ) {
    try {
      await run();
      await this.log(taskId, action, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown executor error";
      await this.log(taskId, action, false, message);
      throw error;
    }
  }

  async prepare({ signal, taskId, wechat }: WechatPrepareContext) {
    const contact = wechat.trim();
    if (!contact) throw new Error("该任务没有微信号，无法准备联系人");

    await this.execute(taskId, "open_wechat", async () => {
      const explicitPath = this.wechatPath
        ? `$wechatPath = ${quotePowerShell(this.wechatPath)}\nif (-not (Test-Path -LiteralPath $wechatPath)) { throw 'BD_WECHAT_PATH does not exist' }\nStart-Process -FilePath $wechatPath`
        : "$wechat = Get-Process -Name WeChat,Weixin,WeChatAppEx -ErrorAction SilentlyContinue | Select-Object -First 1\nif (-not $wechat) { Start-Process 'weixin://' }";
      await this.run(explicitPath, signal);
    });

    await this.execute(taskId, "prepare_contact", async () => {
      await this.run(`Set-Clipboard -Value ${quotePowerShell(contact)}`, signal);
    });
  }

  async recordUserStep(input: {
    action: "search_contact" | "open_profile" | "wait_user_confirm";
    confirmed: boolean;
    taskId: string;
  }) {
    if (!input.confirmed) {
      const error = `用户未确认人工步骤：${input.action}`;
      await this.log(input.taskId, input.action, false, error);
      throw new Error(error);
    }
    await this.log(input.taskId, input.action, true);
  }
}
