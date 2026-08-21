import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let listener;
let requestedPayload;
const messageListeners = new Set();
const context = {
  chrome: { runtime: { onMessage: { addListener(value) { listener = value; } } } },
  clearTimeout() {},
  crypto: { randomUUID() { return "request-1"; } },
  location: { origin: "https://bd-daren-management-system.vercel.app" },
  setTimeout() { return 1; },
  URL,
  window: {
    addEventListener(type, value) { if (type === "message") messageListeners.add(value); },
    postMessage(message) {
      requestedPayload = message.payload;
      queueMicrotask(() => {
        for (const value of messageListeners) value({
          data: {
            requestId: message.requestId,
            response: { message: "已加入资源池", ok: true, status: 201 },
            source: "bd-capture-web",
            type: "captureTalentResourceResult",
          },
          origin: context.location.origin,
          source: context.window,
        });
      });
    },
    removeEventListener(type, value) { if (type === "message") messageListeners.delete(value); },
  },
};
context.globalThis = context;

vm.runInNewContext(fs.readFileSync(new URL("../content/app-bridge.js", import.meta.url), "utf8"), context);
let response;
const keepsChannelOpen = listener({
  endpoint: "https://bd-daren-management-system.vercel.app/api/resources/capture",
  payload: { category: "美食", nickname: "测试达人" },
  type: "captureTalentResource",
}, null, (value) => { response = value; });
assert.equal(keepsChannelOpen, true);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(requestedPayload.nickname, "测试达人");
assert.equal(response.ok, true);
assert.equal(response.message, "已加入资源池");
console.log("app bridge test passed");
