import { spawn } from "node:child_process";

import { detectProxySettings, displayProxyUrl, type ProxySettings } from "./proxy.js";

let activeProxy: ProxySettings | null = null;

function requestTarget(input: string | URL | Request) {
  const value = input instanceof Request ? input.url : input.toString();
  const url = new URL(value);
  return `${url.origin}${url.pathname}`;
}

function networkError(error: unknown) {
  const cause = error instanceof Error && "cause" in error
    ? error.cause as { code?: string; name?: string } | undefined
    : undefined;
  return {
    code: cause?.code ?? "UNKNOWN",
    message: error instanceof Error ? error.message : String(error),
    type: cause?.name ?? (error instanceof Error ? error.name : "UnknownError"),
  };
}

export async function agentFetch(
  input: string | URL | Request,
  init?: RequestInit,
) {
  const target = requestTarget(input);
  console.log(`[network] 请求目标：${target}`);
  try {
    return await globalThis.fetch(input, init);
  } catch (error) {
    const detail = networkError(error);
    console.error(`[network] 请求失败：target=${target} type=${detail.type} code=${detail.code}`, error);
    throw error;
  }
}

function proxyEnvironment(settings: ProxySettings) {
  return {
    ...process.env,
    ALL_PROXY: settings.proxyUrl,
    HTTP_PROXY: settings.proxyUrl,
    HTTPS_PROXY: settings.proxyUrl,
    NO_PROXY: settings.noProxy ?? process.env.NO_PROXY ?? process.env.no_proxy,
  };
}

async function delegateToProxyEnabledNode(settings: ProxySettings) {
  return new Promise<number>((resolve, reject) => {
    const child = spawn(process.execPath, [
      "--use-env-proxy",
      ...process.execArgv,
      ...process.argv.slice(1),
    ], {
      env: proxyEnvironment(settings),
      stdio: "inherit",
      windowsHide: false,
    });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
}

export async function initializeAgentNetwork() {
  activeProxy = await detectProxySettings();
  if (!activeProxy) {
    console.log("[network] 未检测到代理，使用直连");
    return { delegated: false as const };
  }

  console.log(`[network] 检测到代理：${activeProxy.source} ${displayProxyUrl(activeProxy.proxyUrl)}`);
  if (process.execArgv.includes("--use-env-proxy")) {
    return { delegated: false as const };
  }

  console.log("[network] 正在以 Node 环境代理模式重新启动 Agent…");
  const exitCode = await delegateToProxyEnabledNode(activeProxy);
  return { delegated: true as const, exitCode };
}
