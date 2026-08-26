import { randomUUID } from "node:crypto";

import { DesktopTestExecutor } from "./desktop-test.js";

async function main() {
  console.log("开始安全桌面测试：将打开 Agent 自己的记事本、输入固定文本并截图。");
  const executor = new DesktopTestExecutor();
  const result = await executor.execute({
    signal: new AbortController().signal,
    taskId: `manual-${randomUUID()}`,
  });
  console.log(`桌面测试完成，截图：${result.screenshotPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown desktop test error";
  console.error(`桌面测试失败：${message}`);
  process.exitCode = 1;
});
