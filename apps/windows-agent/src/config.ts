import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";

export type LocalAgentConfig = {
  apiBaseUrl?: string;
  installationId: string;
  supabasePublishableKey?: string;
  supabaseUrl?: string;
};

export type RuntimeConfig = {
  accessToken: string;
  apiBaseUrl: string;
  deviceName: string;
  heartbeatIntervalMs: number;
  taskPollingIntervalMs: number;
  version: string;
};

export function getAgentDataDirectory() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) throw new Error("LOCALAPPDATA is unavailable on this Windows account");
  return join(localAppData, "BDTalentAgent");
}

export async function loadOrCreateLocalConfig(): Promise<LocalAgentConfig> {
  const directory = getAgentDataDirectory();
  const path = join(directory, "agent.json");
  try {
    const parsed = JSON.parse(await readFile(path, "utf8")) as Partial<LocalAgentConfig>;
    if (typeof parsed.installationId === "string" && /^[0-9a-f-]{36}$/i.test(parsed.installationId)) {
      return {
        apiBaseUrl: typeof parsed.apiBaseUrl === "string" ? parsed.apiBaseUrl : undefined,
        installationId: parsed.installationId,
        supabasePublishableKey: typeof parsed.supabasePublishableKey === "string"
          ? parsed.supabasePublishableKey
          : undefined,
        supabaseUrl: typeof parsed.supabaseUrl === "string" ? parsed.supabaseUrl : undefined,
      };
    }
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code !== "ENOENT") throw error;
  }

  const config = { installationId: randomUUID() };
  await mkdir(directory, { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return config;
}

export async function saveLocalAuthConfig(input: {
  apiBaseUrl: string;
  supabasePublishableKey: string;
  supabaseUrl: string;
}) {
  const current = await loadOrCreateLocalConfig();
  const config: LocalAgentConfig = { ...current, ...input };
  const directory = getAgentDataDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, "agent.json"), `${JSON.stringify(config, null, 2)}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
  return config;
}

export async function getRuntimeConfig(local: LocalAgentConfig): Promise<RuntimeConfig> {
  const apiBaseUrl = (process.env.BD_WEB_URL?.trim() || local.apiBaseUrl)?.replace(/\/$/, "");
  let accessToken = process.env.BD_AGENT_ACCESS_TOKEN?.trim();
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("BD_WEB_URL must be an absolute http(s) URL");
  }
  if (!accessToken) {
    const { refreshAccessToken } = await import("./auth/session.js");
    accessToken = await refreshAccessToken(local, apiBaseUrl);
  }

  return {
    accessToken,
    apiBaseUrl,
    deviceName: process.env.BD_AGENT_DEVICE_NAME?.trim() || hostname(),
    heartbeatIntervalMs: 30_000,
    taskPollingIntervalMs: 10_000,
    version: "0.1.0",
  };
}
