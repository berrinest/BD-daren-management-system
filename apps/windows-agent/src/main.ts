import { BdAgentApiClient } from "./api-client.js";
import { getRuntimeConfig, loadOrCreateLocalConfig } from "./config.js";
import { runHeartbeatLoop } from "./heartbeat.js";
import { runTaskPolling } from "./task-polling.js";

async function main() {
  const local = await loadOrCreateLocalConfig();
  const runtime = await getRuntimeConfig(local);
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
    await Promise.all([
      runHeartbeatLoop({
        agentId: agent.id,
        client,
        intervalMs: runtime.heartbeatIntervalMs,
        signal: controller.signal,
        version: runtime.version,
      }),
      runTaskPolling({
        agentId: agent.id,
        client,
        intervalMs: runtime.taskPollingIntervalMs,
        signal: controller.signal,
      }),
    ]);
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
  console.error("Windows Agent 启动失败：", error);
  process.exitCode = 1;
});
