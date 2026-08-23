import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function element() {
  return {
    addEventListener() {},
    className: "",
    disabled: false,
    hidden: false,
    replaceChildren() {},
    textContent: "",
  };
}
const elements = new Map([
  ["#agent-meta", element()],
  ["#connection", element()],
  ["#empty", element()],
  ["#notice", element()],
  ["#refresh", element()],
  ["#tasks", element()],
]);
const context = {
  chrome: {
    runtime: {
      async sendMessage(message) {
        if (message.type === "GET_AGENT_STATE") {
          return { config: { agent_id: "agent-12345678", version: "0.2.0" }, connected: false, ok: true };
        }
        throw new Error("GET_TASKS should not run without a BD tab");
      },
    },
  },
  console,
  document: {
    createElement() { return element(); },
    querySelector(selector) { return elements.get(selector); },
  },
  FormData,
  Intl,
  setTimeout,
};

vm.runInNewContext(fs.readFileSync(new URL("../sidepanel/sidepanel.js", import.meta.url), "utf8"), context);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(elements.get("#connection").textContent, "❌ 请打开 BD 系统并登录");
assert.equal(elements.get("#connection").className, "connection disconnected");
console.log("side panel disconnected state test passed");
