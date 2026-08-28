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
    console.log(`[wechat executor] ${action}: start`);
    try {
      await run();
      await this.log(taskId, action, true);
      console.log(`[wechat executor] ${action}: success`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown executor error";
      await this.log(taskId, action, false, message);
      console.error(`[wechat executor] ${action}: fail`);
      console.error(`[wechat executor] ${action}: error: ${message}`);
      throw error;
    }
  }

  async prepare({ signal, taskId, wechat }: WechatPrepareContext) {
    const contact = wechat.trim();
    if (!contact) throw new Error("该任务没有微信号，无法准备联系人");

    await this.execute(taskId, "open_wechat", async () => {
      const explicitPath = this.wechatPath
        ? `$wechatPath = ${quotePowerShell(this.wechatPath)}\nif (-not (Test-Path -LiteralPath $wechatPath)) { throw 'BD_WECHAT_PATH does not exist' }\nStart-Process -FilePath $wechatPath`
        : `$opened = $false
  $protocolError = $null
  try {
    Start-Process -FilePath 'weixin://' -ErrorAction Stop
    $opened = $true
  } catch {
    $protocolError = $_.Exception.Message
  }

  if (-not $opened) {
    $candidates = @()
    foreach ($basePath in @($env:ProgramFiles, ${"${env:ProgramFiles(x86)}"}, $env:LOCALAPPDATA)) {
      if ($basePath) {
        $candidates += Join-Path $basePath 'Tencent\\WeChat\\WeChat.exe'
        $candidates += Join-Path $basePath 'Tencent\\Weixin\\Weixin.exe'
      }
    }
    $wechatPath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if ($wechatPath) {
      Start-Process -FilePath $wechatPath -ErrorAction Stop
      $opened = $true
    }
  }

  if (-not $opened) {
    throw "无法启动微信。weixin:// 失败：$protocolError；常见安装路径中也未找到微信。请设置 BD_WECHAT_PATH。"
  }
`;
      await this.run(explicitPath, signal);
    });

    await this.execute(taskId, "copy_wechat_id", async () => {
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
