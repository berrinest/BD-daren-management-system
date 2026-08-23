import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let installedListener;
let messageListener;
let stored = {};
let forwarded;
const chrome = {
  runtime: {
    getManifest() { return { version: "0.2.0" }; },
    onInstalled: { addListener(listener) { installedListener = listener; } },
    onMessage: { addListener(listener) { messageListener = listener; } },
  },
  storage: {
    local: {
      async get() { return stored; },
      async set(value) { stored = { ...stored, ...value }; },
    },
  },
  tabs: {
    async query() { return [{ id: 9, url: "https://bd-daren-management-system.vercel.app/dashboard" }]; },
    async sendMessage(tabId, message) {
      forwarded = { message, tabId };
      return { data: { task_id: "task-1" }, ok: true, status: 200 };
    },
  },
};
const context = { chrome, console, crypto: { randomUUID() { return "agent-random-id"; } }, Error };
vm.runInNewContext(fs.readFileSync(new URL("../background/service-worker.js", import.meta.url), "utf8"), context);

assert.equal(typeof installedListener, "function");
assert.equal(typeof messageListener, "function");

function dispatch(message) {
  return new Promise((resolve) => {
    assert.equal(messageListener(message, {}, resolve), true);
  });
}

const state = await dispatch({ type: "GET_AGENT_STATE" });
assert.equal(state.config.agent_id, "agent-random-id");
assert.equal(stored.agent_id, "agent-random-id");
assert.equal(stored.version, "0.2.0");

await dispatch({ task_id: "task-1", type: "CLAIM_TASK" });
assert.equal(forwarded.tabId, 9);
assert.equal(forwarded.message.path, "/api/agent/tasks/task-1/claim");
assert.equal(forwarded.message.body.agent_id, "agent-random-id");

await dispatch({
  result: { result_code: "replied", result_notes: "人工确认已回复" },
  task_id: "task-1",
  type: "SUBMIT_RESULT",
});
assert.equal(forwarded.message.path, "/api/agent/tasks/task-1/result");
assert.equal(forwarded.message.body.result_code, "replied");
console.log("service worker test passed");
