import { createInterface } from "node:readline/promises";

import type { AgentTask, BdAgentApiClient } from "./api-client.js";

function wait(delayMs: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timeout = setTimeout(resolve, delayMs);
    signal.addEventListener("abort", () => {
      clearTimeout(timeout);
      resolve();
    }, { once: true });
  });
}

function printTask(task: AgentTask) {
  console.log("\n发现待领取的 Agent 任务：");
  console.log(`  达人：${task.target.nickname}`);
  console.log(`  平台：${task.target.platform}`);
  console.log(`  账号：${task.target.platform_account ?? "未填写"}`);
  console.log(`  微信：${task.target.wechat ?? "未填写"}`);
  console.log(`  下一步：${task.next_action ?? "微信添加好友"}`);
  console.log(`  到期时间：${task.due_at}`);
}

export async function runTaskPolling(options: {
  agentId: string;
  client: BdAgentApiClient;
  intervalMs: number;
  signal: AbortSignal;
}) {
  const reviewed = new Set<string>();
  const input = createInterface({ input: process.stdin, output: process.stdout });
  options.signal.addEventListener("abort", () => input.close(), { once: true });

  try {
    while (!options.signal.aborted) {
      try {
        const tasks = await options.client.getTasks();
        const task = tasks.find(
          (candidate) => candidate.status === "pending" && !reviewed.has(candidate.task_id),
        );
        if (task) {
          reviewed.add(task.task_id);
          printTask(task);
          const answer = await input.question("是否由本机 Agent 领取？[y/N] ");
          if (/^y(es)?$/i.test(answer.trim())) {
            const claim = await options.client.claimTask(task.task_id, options.agentId);
            console.log(`任务已领取：${claim.task_id}，状态 ${claim.status}`);
            console.log("Phase 8.2 不执行微信操作，请在 Web 任务中心查看或恢复任务。");
          } else {
            console.log("已跳过本次领取；任务仍保持 pending。 ");
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown polling error";
        console.warn(`[tasks] 拉取或领取失败，将在下一周期重试：${message}`);
      }
      await wait(options.intervalMs, options.signal);
    }
  } finally {
    input.close();
  }
}
