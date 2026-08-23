import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.className = "";
    this.disabled = false;
    this.hidden = false;
    this.listeners = {};
    this.name = "";
    this.textContent = "";
    this.value = "";
  }
  addEventListener(type, listener) { this.listeners[type] = listener; }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

const elements = new Map([
  ["#agent-meta", new FakeElement()],
  ["#connection", new FakeElement()],
  ["#empty", new FakeElement()],
  ["#notice", new FakeElement()],
  ["#refresh", new FakeElement("button")],
  ["#tasks", new FakeElement("section")],
]);
const task = {
  due_at: "2026-08-23T10:00:00Z",
  next_action: "回复达人",
  status: "in_progress",
  target: {
    nickname: "测试达人",
    platform: "douyin",
    platform_account: "test-account",
    type: "talent",
  },
  task_id: "550e8400-e29b-41d4-a716-446655440000",
  task_type: "follow_up",
};
let completed = false;
let submitted;
const context = {
  chrome: {
    runtime: {
      async sendMessage(message) {
        if (message.type === "GET_AGENT_STATE") {
          return { config: { agent_id: "agent-12345678", version: "0.2.0" }, connected: true, ok: true };
        }
        if (message.type === "GET_TASKS") {
          return { data: { tasks: completed ? [] : [task] }, ok: true, status: 200 };
        }
        if (message.type === "SUBMIT_RESULT") {
          submitted = message;
          completed = true;
          return { data: { success: true }, ok: true, status: 200 };
        }
        throw new Error(`Unexpected message: ${message.type}`);
      },
    },
  },
  console,
  document: {
    createElement(tagName) { return new FakeElement(tagName); },
    querySelector(selector) { return elements.get(selector); },
  },
  FormData: class {
    constructor(form) {
      this.values = new Map(
        descendants(form)
          .filter((item) => item.name)
          .map((item) => [item.name, item.value]),
      );
    }
    get(name) { return this.values.get(name) ?? null; }
  },
  Intl,
};

vm.runInNewContext(fs.readFileSync(new URL("../sidepanel/sidepanel.js", import.meta.url), "utf8"), context);
await new Promise((resolve) => setImmediate(resolve));

const card = elements.get("#tasks").children[0];
const form = descendants(card).find((item) => item.tagName === "FORM");
const select = descendants(form).find((item) => item.tagName === "SELECT");
select.value = "replied";
await form.listeners.submit({ preventDefault() {} });
await new Promise((resolve) => setImmediate(resolve));

assert.equal(submitted.type, "SUBMIT_RESULT");
assert.equal(submitted.task_id, task.task_id);
assert.equal(submitted.result.result_code, "replied");
assert.equal(elements.get("#notice").textContent, "执行结果已保存，任务已完成。");
assert.equal(elements.get("#tasks").children.length, 0);
console.log("side panel task result flow test passed");
