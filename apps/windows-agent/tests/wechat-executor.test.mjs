import assert from "node:assert/strict";
import test from "node:test";

import { WechatAssistExecutor } from "../dist/executor/wechat/index.js";

test("WeChat executor only launches the public client, copies contact, and logs manual confirmations", async () => {
  const scripts = [];
  const logs = [];
  const executor = new WechatAssistExecutor(
    async (script) => { scripts.push(script); },
    async (entry) => { logs.push(entry); },
  );
  const controller = new AbortController();

  await executor.prepare({
    signal: controller.signal,
    taskId: "task-1",
    wechat: "wx'test",
  });
  for (const action of ["search_contact", "open_profile", "wait_user_confirm"]) {
    await executor.recordUserStep({ action, confirmed: true, taskId: "task-1" });
  }

  assert.equal(scripts.length, 2);
  assert.match(scripts[0], /weixin:\/\//);
  assert.match(scripts[1], /Set-Clipboard/);
  assert.match(scripts[1], /wx''test/);
  assert.doesNotMatch(scripts.join("\n"), /SendKeys|mouse_event|SetCursorPos|SetForegroundWindow/i);
  assert.deepEqual(logs.map((entry) => entry.action), [
    "open_wechat",
    "prepare_contact",
    "search_contact",
    "open_profile",
    "wait_user_confirm",
  ]);
  assert.equal(logs.every((entry) => entry.success), true);
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
