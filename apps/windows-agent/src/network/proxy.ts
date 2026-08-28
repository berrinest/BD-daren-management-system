import { spawn } from "node:child_process";

export type ProxySettings = {
  noProxy: string | null;
  proxyUrl: string;
  source: string;
};

type WindowsInternetSettings = {
  autoConfigUrl?: string | null;
  proxyEnable?: number;
  proxyOverride?: string | null;
  proxyServer?: string | null;
};

function envValue(env: NodeJS.ProcessEnv, name: string) {
  return env[name] ?? env[name.toLowerCase()];
}

function normalizeProxyUrl(value: string) {
  const normalized = /^https?:\/\//i.test(value) ? value : `http://${value}`;
  const url = new URL(normalized);
  if (!url.hostname) throw new Error("Proxy address has no hostname");
  return url.toString();
}

export function parseWindowsProxyServer(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!trimmed.includes("=")) return normalizeProxyUrl(trimmed);

  const entries = new Map(
    trimmed.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 1) return [];
      return [[part.slice(0, separator).trim().toLowerCase(), part.slice(separator + 1).trim()]];
    }),
  );
  const selected = entries.get("https") || entries.get("http");
  return selected ? normalizeProxyUrl(selected) : null;
}

function normalizeWindowsBypass(value: string | null | undefined) {
  if (!value) return null;
  return value
    .split(";")
    .flatMap((entry) => entry.trim() === "<local>" ? ["localhost", "127.0.0.1", "::1"] : [entry.trim()])
    .filter(Boolean)
    .join(",");
}

export function resolveProxySettings(
  env: NodeJS.ProcessEnv,
  windows: WindowsInternetSettings | null,
): ProxySettings | null {
  for (const name of ["HTTPS_PROXY", "HTTP_PROXY", "ALL_PROXY"] as const) {
    const value = envValue(env, name)?.trim();
    if (value) {
      return {
        noProxy: envValue(env, "NO_PROXY")?.trim() || null,
        proxyUrl: normalizeProxyUrl(value),
        source: `environment:${name}`,
      };
    }
  }

  if (windows?.proxyEnable === 1 && windows.proxyServer) {
    const proxyUrl = parseWindowsProxyServer(windows.proxyServer);
    if (proxyUrl) {
      return {
        noProxy: normalizeWindowsBypass(windows.proxyOverride),
        proxyUrl,
        source: "windows-system",
      };
    }
  }
  return null;
}

async function runPowerShellCapture(script: string) {
  const encoded = Buffer.from(script, "utf16le").toString("base64");
  return new Promise<string>((resolve, reject) => {
    const child = spawn("powershell.exe", [
      "-NoLogo", "-NoProfile", "-NonInteractive", "-EncodedCommand", encoded,
    ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => { stdout += chunk; });
    child.stderr.on("data", (chunk: string) => { stderr += chunk; });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || `PowerShell exited with code ${code}`));
    });
  });
}

export async function readWindowsInternetSettings(): Promise<WindowsInternetSettings | null> {
  if (process.platform !== "win32") return null;
  const script = `$value = Get-ItemProperty -LiteralPath 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'\n[pscustomobject]@{ proxyEnable = $value.ProxyEnable; proxyServer = $value.ProxyServer; proxyOverride = $value.ProxyOverride; autoConfigUrl = $value.AutoConfigURL } | ConvertTo-Json -Compress`;
  try {
    const output = await runPowerShellCapture(script);
    return output ? JSON.parse(output) as WindowsInternetSettings : null;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown Windows proxy error";
    console.warn(`[network] Windows 系统代理读取失败，将继续直连：${message}`);
    return null;
  }
}

export function displayProxyUrl(proxyUrl: string) {
  const url = new URL(proxyUrl);
  return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ""}`;
}

export async function detectProxySettings(env = process.env) {
  const environmentProxy = resolveProxySettings(env, null);
  if (environmentProxy) return environmentProxy;
  return resolveProxySettings(env, await readWindowsInternetSettings());
}
