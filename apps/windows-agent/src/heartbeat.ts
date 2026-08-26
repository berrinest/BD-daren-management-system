import type { BdAgentApiClient } from "./api-client.js";

function waitForNextHeartbeat(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

export async function runHeartbeatLoop(options: {
  agentId: string;
  client: BdAgentApiClient;
  intervalMs: number;
  signal: AbortSignal;
  version: string;
}) {
  while (!options.signal.aborted) {
    try {
      const heartbeat = await options.client.heartbeat(options.agentId, options.version, "active");
      console.log(`[heartbeat] ${heartbeat.last_seen_at}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown heartbeat error";
      console.warn(`[heartbeat] 同步失败，将在下一周期重试：${message}`);
    }
    await waitForNextHeartbeat(options.intervalMs, options.signal);
  }
}
