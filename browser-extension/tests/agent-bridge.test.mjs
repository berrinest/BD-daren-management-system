import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let listener;
const messageListeners = new Set();
const posted = [];
const context = {
  chrome: { runtime: { onMessage: { addListener(value) { listener = value; } } } },
  clearTimeout() {},
  crypto: { randomUUID() { return "agent-request-1"; } },
  location: { origin: "https://bd-daren-management-system.vercel.app" },
  setTimeout() { return 1; },
  URL,
  window: {
    addEventListener(type, value) { if (type === "message") messageListeners.add(value); },
    postMessage(message) {
      posted.push(message);
      if (message.type !== "agent_request") return;
      queueMicrotask(() => {
        for (const value of messageListeners) value({
          data: {
            requestId: message.requestId,
            response: { data: { tasks: [] }, ok: true, status: 200 },
            source: "bd-agent-web",
            type: "agent_response",
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

let allowedResponse;
assert.equal(listener({ method: "GET", path: "/api/agent/tasks?scope=today", type: "agentApiRequest" }, null, (value) => { allowedResponse = value; }), true);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(posted.at(-1).type, "agent_request");
assert.equal(allowedResponse.ok, true);

let mutationResponse;
assert.equal(listener({
  body: { agent_id: "agent-1" },
  method: "POST",
  path: "/api/agent/tasks/550e8400-e29b-41d4-a716-446655440000/claim",
  type: "agentApiRequest",
}, null, (value) => { mutationResponse = value; }), true);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(posted.at(-1).request.method, "POST");
assert.equal(mutationResponse.ok, true);

let rejectedResponse;
assert.equal(listener({ method: "POST", path: "/api/resources/capture", type: "agentApiRequest" }, null, (value) => { rejectedResponse = value; }), false);
assert.equal(rejectedResponse.status, 403);
assert.equal(rejectedResponse.error.code, "AGENT_REQUEST_NOT_ALLOWED");
console.log("agent bridge whitelist test passed");
