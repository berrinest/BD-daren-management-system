import { createInterface } from "node:readline/promises";

import type { AgentTask, BdAgentApiClient } from "./api-client.js";
import {
  DesktopTestExecutor,
  WechatAssistExecutor,
  type DesktopExecutor,
  type WechatExecutor,
} from "./executor/index.js";

function confirmed(answer: string) {
  return /^y(es)?$/i.test(answer.trim());
}

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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message.slice(0, 1000) : "未知执行错误";
}

async function reportFailure(
  client: BdAgentApiClient,
  taskId: string,
  agentId: string,
  error: unknown,
) {
  const message = errorMessage(error);
  try {
    await client.updateTaskState(taskId, agentId, "failed", {
      action: "execution_failed",
      error: message,
    });
    console.warn(`任务已保留为失败状态，可在 Web 任务中心恢复：${message}`);
  } catch (reportError) {
    console.warn(
      `失败状态暂时无法同步，任务仍保持 in_progress，可在 Web 恢复。原因：${errorMessage(reportError)}`,
    );
  }
}

export async function runTaskPolling(options: {
  agentId: string;
  client: BdAgentApiClient;
  desktopExecutor?: DesktopExecutor;
  wechatExecutor?: WechatExecutor;
  intervalMs: number;
  signal: AbortSignal;
}) {
  const reviewed = new Set<string>();
  const desktopExecutor = options.desktopExecutor ?? new DesktopTestExecutor();
  const wechatExecutor = options.wechatExecutor ?? new WechatAssistExecutor();
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
          if (confirmed(answer)) {
            const claim = await options.client.claimTask(task.task_id, options.agentId);
            console.log(`任务已领取：${claim.task_id}，执行状态 ${claim.execution_status}`);
            const isDesktopTest = task.task_type === "desktop_test";
            const start = await input.question(isDesktopTest
              ? "确认进入 running 并执行安全桌面测试（记事本、固定文本、截图）？[y/N] "
              : "确认进入 running 并准备微信辅助流程（仅启动微信和复制微信号）？[y/N] ");
            if (confirmed(start)) {
              const running = await options.client.updateTaskState(
                task.task_id,
                options.agentId,
                "running",
                { action: isDesktopTest ? "desktop_test" : "open_wechat" },
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
                } else if (task.task_type === "wechat_add_friend") {
                  if (!task.target.wechat) {
                    throw new Error("该任务没有微信号，无法进入微信辅助流程");
                  }
                  console.log("正在启动微信并将微信号复制到剪贴板；Agent 不会搜索、点击或发送…");
                  await wechatExecutor.prepare({
                    signal: options.signal,
                    taskId: task.task_id,
                    wechat: task.target.wechat,
                  });
                  await options.client.updateTaskState(task.task_id, options.agentId, "running", {
                    action: "prepare_contact",
                  });
                  console.log(`微信号已复制：${task.target.wechat}`);

                  const searched = await input.question("请在微信中粘贴并搜索。已完成搜索？[y/N] ");
                  await wechatExecutor.recordUserStep({
                    action: "search_contact",
                    confirmed: confirmed(searched),
                    taskId: task.task_id,
                  });
                  await options.client.updateTaskState(task.task_id, options.agentId, "running", {
                    action: "search_contact",
                  });
                  const opened = await input.question("已人工打开正确的联系人资料页？[y/N] ");
                  await wechatExecutor.recordUserStep({
                    action: "open_profile",
                    confirmed: confirmed(opened),
                    taskId: task.task_id,
                  });
                  await options.client.updateTaskState(task.task_id, options.agentId, "running", {
                    action: "open_profile",
                  });
                  const sent = await input.question("请人工核对并发送好友申请。确认已经手动发送？[y/N] ");
                  await wechatExecutor.recordUserStep({
                    action: "wait_user_confirm",
                    confirmed: confirmed(sent),
                    taskId: task.task_id,
                  });
                  await options.client.updateTaskState(task.task_id, options.agentId, "running", {
                    action: "wait_user_confirm",
                  });
                  const result = await options.client.submitWechatAssistedResult(
                    task.task_id,
                    options.agentId,
                  );
                  console.log(`人工确认结果已回传：任务状态 ${result.task.status}`);
                }
              } catch (error) {
                await reportFailure(options.client, task.task_id, options.agentId, error);
                throw error;
              }
            } else {
              const failed = await options.client.updateTaskState(
                task.task_id,
                options.agentId,
                "failed",
                { action: "user_cancelled", error: "用户取消了本次执行" },
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
