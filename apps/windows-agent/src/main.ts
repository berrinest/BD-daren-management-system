import { BdAgentApiClient } from "./api-client.js";
import { getRuntimeConfig, loadOrCreateLocalConfig } from "./config.js";
import { runHeartbeatLoop } from "./heartbeat.js";

async function main() {
  const runtime = getRuntimeConfig();
  const local = await loadOrCreateLocalConfig();
  const client = new BdAgentApiClient(runtime.apiBaseUrl, runtime.accessToken);
  const controller = new AbortController();

  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.once(signal, () => {
      console.log("\n正在安全停止 Windows Agent…");
      controller.abort();
    });
  }

  console.log(`正在连接 ${runtime.apiBaseUrl}`);
  const agent = await client.register({
    deviceName: runtime.deviceName,
    installationId: local.installationId,
    version: runtime.version,
  });
  console.log(`Agent 已注册：${agent.device_name} (${agent.id})`);

  try {
    await runHeartbeatLoop({
      agentId: agent.id,
      client,
      intervalMs: runtime.heartbeatIntervalMs,
      signal: controller.signal,
      version: runtime.version,
    });
  } finally {
    try {
      await client.heartbeat(agent.id, runtime.version, "paused");
      console.log("Agent 已暂停并安全退出");
    } catch {
      console.warn("退出状态未能同步；Web 将在心跳超时后显示离线");
    }
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  console.error(`Windows Agent 启动失败：${message}`);
  process.exitCode = 1;
});
