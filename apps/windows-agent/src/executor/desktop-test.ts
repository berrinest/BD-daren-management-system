import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import { getAgentDataDirectory } from "../config.js";
import { createExecutionLogWriter, type ExecutionLogWriter } from "./logger.js";
import { runPowerShell } from "./powershell.js";
import type { DesktopExecutor, ExecutorContext } from "./types.js";

type PowerShellRunner = (script: string, signal: AbortSignal) => Promise<void>;

function quotePowerShell(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export class DesktopTestExecutor implements DesktopExecutor {
  constructor(
    private readonly runner: PowerShellRunner = runPowerShell,
    private readonly writeLog: ExecutionLogWriter = createExecutionLogWriter(),
    private readonly screenshotDirectory = join(getAgentDataDirectory(), "screenshots"),
  ) {}

  async execute({ signal, taskId }: ExecutorContext) {
    const action = "desktop_test.notepad_type_and_screenshot";
    const timestamp = new Date().toISOString();
    const filename = `${taskId}-${timestamp.replaceAll(":", "-")}.png`;
    const screenshotPath = join(this.screenshotDirectory, filename);
    await mkdir(this.screenshotDirectory, { recursive: true });

    const script = `
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public static class AgentWindow {
  [DllImport("user32.dll")]
  public static extern bool SetForegroundWindow(IntPtr hWnd);
}
'@
$existingIds = @(Get-Process -Name 'notepad' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id)
$launcher = Start-Process -FilePath 'notepad.exe' -PassThru
$process = $null
try {
  for ($attempt = 0; $attempt -lt 20 -and -not $process; $attempt++) {
    Start-Sleep -Milliseconds 150
    $process = Get-Process -Name 'notepad' -ErrorAction SilentlyContinue |
      Where-Object { $_.Id -notin $existingIds -and $_.MainWindowHandle -ne 0 } |
      Sort-Object StartTime -Descending |
      Select-Object -First 1
  }
  if (-not $process) { throw 'Unable to find the Agent-owned Notepad window' }
  if (-not [AgentWindow]::SetForegroundWindow($process.MainWindowHandle)) {
    throw 'Unable to activate the Agent-owned Notepad window'
  }
  Start-Sleep -Milliseconds 250
  [System.Windows.Forms.SendKeys]::SendWait('BD Agent desktop test - no platform automation')
  Start-Sleep -Milliseconds 500
  $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
  $bitmap = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  try {
    $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
    $bitmap.Save(${quotePowerShell(screenshotPath)}, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $graphics.Dispose()
    $bitmap.Dispose()
  }
} finally {
  Get-Process -Name 'notepad' -ErrorAction SilentlyContinue |
    Where-Object { $_.Id -notin $existingIds } |
    Stop-Process -Force -ErrorAction SilentlyContinue
}`;

    try {
      await this.runner(script, signal);
      await this.writeLog({ action, error: null, success: true, task_id: taskId, timestamp });
      return { action, screenshotPath };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown desktop execution error";
      await this.writeLog({ action, error: message, success: false, task_id: taskId, timestamp });
      throw error;
    }
  }
}
