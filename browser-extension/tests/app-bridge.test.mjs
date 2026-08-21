import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let listener;
let requestedPayload;
const context = {
  AbortController,
  chrome: { runtime: { onMessage: { addListener(value) { listener = value; } } } },
  clearTimeout() {},
  DOMException,
  fetch: async (endpoint, options) => {
    assert.equal(String(endpoint), "https://bd-daren-management-system.vercel.app/api/resources/capture");
    assert.equal(options.credentials, "include", "bridge must include the signed-in web session cookie");
    requestedPayload = JSON.parse(options.body);
    return {
      async json() { return { message: "已加入资源池" }; },
      ok: true,
      redirected: false,
      status: 201,
      url: String(endpoint),
    };
  },
  location: { origin: "https://bd-daren-management-system.vercel.app" },
  setTimeout() { return 1; },
  URL,
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
