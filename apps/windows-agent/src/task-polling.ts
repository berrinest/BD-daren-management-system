import { createInterface } from "node:readline/promises";

import type { AgentTask, BdAgentApiClient } from "./api-client.js";
import { DesktopTestExecutor, type DesktopExecutor } from "./executor/index.js";

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
  desktopExecutor?: DesktopExecutor;
  intervalMs: number;
  signal: AbortSignal;
}) {
  const reviewed = new Set<string>();
  const desktopExecutor = options.desktopExecutor ?? new DesktopTestExecutor();
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
            console.log(`任务已领取：${claim.task_id}，执行状态 ${claim.execution_status}`);
            const isDesktopTest = task.task_type === "desktop_test";
            const start = await input.question(isDesktopTest
              ? "确认进入 running 并执行安全桌面测试（记事本、固定文本、截图）？[y/N] "
              : "确认进入 running 并执行通信模拟？不会操作微信。[y/N] ");
            if (/^y(es)?$/i.test(start.trim())) {
              const running = await options.client.updateTaskState(
                task.task_id,
                options.agentId,
                "running",
              );
              console.log(`任务执行状态：${running.execution_status}`);
              try {
                if (isDesktopTest) {
                  console.log("正在执行安全桌面测试；不会访问微信或其他平台…");
                  const execution = await desktopExecutor.execute({
                    signal: options.signal,
                    taskId: task.task_id,
                  });
                  console.log(`截图已保存：${execution.screenshotPath}`);
                  const result = await options.client.submitDesktopTestResult(
                    task.task_id,
                    options.agentId,
                    execution.screenshotPath,
                  );
                  console.log(`桌面测试结果已回传：任务状态 ${result.task.status}`);
                } else {
                  console.log("正在模拟执行通信（不操作微信、鼠标或键盘）…");
                  const result = await options.client.submitSimulatedResult(
                    task.task_id,
                    options.agentId,
                  );
                  console.log(`模拟结果已回传：任务状态 ${result.task.status}`);
                }
              } catch (error) {
                await options.client.updateTaskState(task.task_id, options.agentId, "failed");
                throw error;
              }
            } else {
              const failed = await options.client.updateTaskState(
                task.task_id,
                options.agentId,
                "failed",
              );
              console.log(`未确认模拟执行，任务执行状态：${failed.execution_status}`);
            }
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
