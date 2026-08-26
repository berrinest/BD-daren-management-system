import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { hostname } from "node:os";
import { join } from "node:path";

export type LocalAgentConfig = {
  installationId: string;
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
      return { installationId: parsed.installationId };
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

export function getRuntimeConfig(): RuntimeConfig {
  const apiBaseUrl = process.env.BD_WEB_URL?.trim().replace(/\/$/, "");
  const accessToken = process.env.BD_AGENT_ACCESS_TOKEN?.trim();
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("BD_WEB_URL must be an absolute http(s) URL");
  }
  if (!accessToken) {
    throw new Error("BD_AGENT_ACCESS_TOKEN is required");
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
