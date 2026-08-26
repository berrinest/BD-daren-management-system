import { spawn } from "node:child_process";

export function quotePowerShell(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

export async function runPowerShell(script: string, signal: AbortSignal) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded],
      { signal, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
    });
  });
}
