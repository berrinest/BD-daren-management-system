import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const listeners = {};
const createElement = (value = "") => ({
  classList: { toggle() {} },
  disabled: false,
  textContent: "",
  value,
});
const elements = new Map([
  ["#capture-form", { ...createElement(), addEventListener(type, listener) { listeners[type] = listener; } }],
  ["#category", createElement("美食")],
  ["#debug-output", createElement()],
  ["#description", createElement()],
  ["#follower-count", createElement()],
  ["#nickname", createElement()],
  ["#platform", createElement("douyin")],
  ["#platform-account", createElement()],
  ["#profile-url", createElement()],
  ["#refresh", { ...createElement(), addEventListener() {} }],
  ["#send", createElement()],
  ["#status", createElement()],
  ["#web-app-url", createElement()],
]);

let requestedEndpoint = "";
let requestedPayload = null;
const chrome = {
  permissions: { async request() { return true; } },
  scripting: {
    async executeScript(options) {
      assert.equal(options.files?.join(","), "content/app-bridge.js");
      return [];
    },
  },
  storage: {
    local: {
      async get() { return {}; },
      async set() {},
    },
  },
  tabs: {
    async query(query) {
      if (query.active) return [{ id: 1, url: "https://www.douyin.com/user/target" }];
      return [{ id: 2, url: "https://bd-daren-management-system.vercel.app/dashboard" }];
    },
    async sendMessage(tabId, message) {
      if (message?.type === "captureTalentResource") {
        requestedEndpoint = message.endpoint;
        requestedPayload = message.payload;
        return { message: "已加入资源池", ok: true, status: 201 };
      }
      return {
        debug: {},
        ok: true,
        profile: {
          description: "公开简介",
          followerCount: 1246346,
          nickname: "测试达人",
          platform: "douyin",
          platformAccount: "douyin-account",
          profileUrl: "https://www.douyin.com/user/target",
        },
      };
    },
  },
};

const context = {
  AbortController,
  chrome,
  console,
  document: { querySelector(selector) { return elements.get(selector); } },
  DOMException,
  setTimeout() { return 1; },
  clearTimeout() {},
  URL,
};

vm.runInNewContext(fs.readFileSync(new URL("../popup/popup.js", import.meta.url), "utf8"), context);
await new Promise((resolve) => setImmediate(resolve));
await listeners.submit({ preventDefault() {} });

assert.equal(requestedEndpoint, "https://bd-daren-management-system.vercel.app/api/resources/capture");
assert.equal(requestedPayload.category, "美食");
assert.equal(requestedPayload.follower_count, 1246000);
assert.equal(elements.get("#status").textContent, "已加入资源池");
assert.equal(elements.get("#send").textContent, "已采集");
assert.equal(typeof chrome.tabs.create, "undefined", "background capture must not open a new tab");
console.log("popup background capture test passed");
