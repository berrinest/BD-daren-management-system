import assert from "node:assert/strict";
import test from "node:test";

import { WechatAssistExecutor } from "../dist/executor/wechat/index.js";

test("WeChat executor only launches the public client, copies contact, and logs manual confirmations", async () => {
  const scripts = [];
  const logs = [];
  const consoleMessages = [];
  const originalLog = console.log;
  console.log = (...values) => { consoleMessages.push(values.join(" ")); };
  const executor = new WechatAssistExecutor(
    async (script) => { scripts.push(script); },
    async (entry) => { logs.push(entry); },
  );
  const controller = new AbortController();

  try {
    await executor.prepare({
      signal: controller.signal,
      taskId: "task-1",
      wechat: "wx'test",
    });
    for (const action of ["search_contact", "open_profile", "wait_user_confirm"]) {
      await executor.recordUserStep({ action, confirmed: true, taskId: "task-1" });
    }
  } finally {
    console.log = originalLog;
  }

  assert.deepEqual(consoleMessages.slice(0, 3), [
    "[wechat executor] begin",
    "[wechat executor] calling open_wechat",
    "[wechat executor] open_wechat: start",
  ]);
  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /weixin:\/\//);
  assert.match(scripts[0], /BD_WECHAT_PATH/);
  assert.match(scripts[0], /Tencent\\WeChat\\WeChat\.exe/);
  assert.match(scripts[0], /Tencent\\Weixin\\Weixin\.exe/);
  assert.match(scripts[1], /Set-Clipboard/);
  assert.match(scripts[1], /wx''test/);
  assert.doesNotMatch(scripts.join("\n"), /SendKeys|mouse_event|SetCursorPos|SetForegroundWindow/i);
  assert.deepEqual(logs.map((entry) => entry.action), [
    "open_wechat",
    "copy_wechat_id",
    "search_contact",
    "open_profile",
    "wait_user_confirm",
  ]);
  assert.equal(logs.every((entry) => entry.success), true);
});

test("WeChat executor reports and logs the real failing step", async () => {
  const logs = [];
  const executor = new WechatAssistExecutor(
    async () => { throw new Error("找不到微信客户端"); },
    async (entry) => { logs.push(entry); },
  );

  await assert.rejects(
    executor.prepare({ signal: new AbortController().signal, taskId: "task-3", wechat: "wx-test" }),
    /找不到微信客户端/,
  );
  assert.deepEqual(logs[0], {
    action: "open_wechat",
    error: "找不到微信客户端",
    success: false,
    task_id: "task-3",
    timestamp: logs[0].timestamp,
  });
});

test("WeChat executor records a declined human confirmation as failure", async () => {
  const logs = [];
  const executor = new WechatAssistExecutor(async () => {}, async (entry) => { logs.push(entry); });

  await assert.rejects(
    executor.recordUserStep({ action: "wait_user_confirm", confirmed: false, taskId: "task-2" }),
    /用户未确认人工步骤/,
  );
  assert.equal(logs[0].action, "wait_user_confirm");
  assert.equal(logs[0].success, false);
});
