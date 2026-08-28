import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";

export function quotePowerShell(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

function decodeXml(value: string) {
  return value
    .replaceAll("_x000D__x000A_", "\n")
    .replaceAll("_x000A_", "\n")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&");
}

const errorMarker = "__BD_AGENT_ERROR__";

function readMarkedError(value: string) {
  const encoded = value.match(new RegExp(`${errorMarker}([A-Za-z0-9+/=]+)`))?.[1];
  if (!encoded) return "";
  try {
    return Buffer.from(encoded, "base64").toString("utf8").trim();
  } catch {
    return "";
  }
}

function decodePowerShellBuffer(chunks: Buffer[]) {
  if (chunks.length === 0) return "";
  const value = Buffer.concat(chunks);
  const hasUtf16LeBom = value.length >= 2 && value[0] === 0xff && value[1] === 0xfe;
  const nulCount = value.subarray(0, Math.min(value.length, 200)).filter((byte) => byte === 0).length;
  if (hasUtf16LeBom || nulCount > 8) return value.toString("utf16le").replace(/^\uFEFF/, "");

  const decoder = new StringDecoder("utf8");
  return decoder.write(value) + decoder.end();
}

export function formatPowerShellError(raw: string) {
  const value = raw.trim();
  if (!value) return "";
  const markedError = readMarkedError(value);
  if (markedError) return markedError;
  if (!value.includes("#< CLIXML")) return value;

  const messages = [...value.matchAll(/<S\b[^>]*\bS="Error"[^>]*>([\s\S]*?)<\/S>/g)]
    .map((match) => decodeXml(match[1] ?? "").trim())
    .filter(Boolean);
  if (messages.length > 0) return messages.at(-1) ?? "";

  const fallback = decodeXml(value.replace("#< CLIXML", "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
  return fallback || "PowerShell 执行失败（错误流为 CLIXML，未找到可读错误信息）";
}

export async function runPowerShell(script: string, signal: AbortSignal) {
  const wrappedScript = `[Console]::OutputEncoding = [Text.UTF8Encoding]::new($false)
try {
${script}
} catch {
  $errorBytes = [Text.Encoding]::UTF8.GetBytes($_.Exception.Message)
  [Console]::Out.Write('${errorMarker}' + [Convert]::ToBase64String($errorBytes))
  exit 1
}`;
  const encoded = Buffer.from(wrappedScript, "utf16le").toString("base64");
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "powershell.exe",
      ["-NoLogo", "-NoProfile", "-NonInteractive", "-OutputFormat", "Text", "-EncodedCommand", encoded],
      { signal, stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
    );
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else {
        const stderrOutput = decodePowerShellBuffer(stderr);
        const stdoutOutput = decodePowerShellBuffer(stdout);
        const markedError = readMarkedError(`${stdoutOutput}\n${stderrOutput}`);
        const stderrMessage = formatPowerShellError(stderrOutput);
        const stdoutMessage = formatPowerShellError(stdoutOutput);
        const unmarkedError = [stdoutMessage, stderrMessage].filter(Boolean).join(" | ");
        reject(new Error(markedError || unmarkedError || `PowerShell exited with code ${code}`));
      }
    });
  });
}
