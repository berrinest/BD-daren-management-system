import assert from "node:assert/strict";
import test from "node:test";

import { getWechatExecutionSnapshot } from "../src/lib/data/agent-task-dto.ts";
import {
  findUnsupportedTemplateVariables,
  prepareWechatExecutionSnapshot,
  renderWechatTemplate,
} from "../src/lib/tasks/wechat-execution.ts";

test("renders only the supported WeChat template variables", () => {
  assert.equal(
    renderWechatTemplate("你好{nickname}，来自{platform}，账号{account}", {
      account: "pemi-account",
      nickname: "Pemi",
      platform: "douyin",
    }),
    "你好Pemi，来自douyin，账号pemi-account",
  );
  assert.deepEqual(findUnsupportedTemplateVariables("你好{name} {nickname}"), ["{name}"]);
  assert.deepEqual(findUnsupportedTemplateVariables("你好{nickname"), ["不完整的变量占位符"]);
});

test("builds Agent execution data only from a complete task snapshot", () => {
  const snapshot = {
    execution_expected_nickname: "Pemi",
    execution_greeting_message: "你好Pemi",
    execution_remark: "Pemi",
    execution_talent_level: "A",
    execution_wechat_id: "Pemi-pro",
  };
  assert.deepEqual(getWechatExecutionSnapshot(snapshot), {
    expected_nickname: "Pemi",
    greeting_message: "你好Pemi",
    remark: "Pemi",
    talent_level: "A",
    wechat_id: "Pemi-pro",
  });
  assert.equal(getWechatExecutionSnapshot({ ...snapshot, execution_wechat_id: null }), null);
  assert.equal(getWechatExecutionSnapshot({ ...snapshot, execution_talent_level: "high" }), null);
});

test("rejects missing or disabled configuration before creating a WeChat task", () => {
  const talent = {
    nickname: "Pemi",
    platform: "douyin",
    platformAccount: "pemi-account",
    talentLevel: "A",
    wechat: "Pemi-pro",
  };
  assert.deepEqual(prepareWechatExecutionSnapshot(talent, null), {
    error: "请先配置并启用 A 类微信招呼语",
    ok: false,
  });
  assert.deepEqual(prepareWechatExecutionSnapshot(talent, {
    enabled: false,
    greetingMessage: "你好{nickname}",
  }), {
    error: "请先配置并启用 A 类微信招呼语",
    ok: false,
  });
  assert.deepEqual(prepareWechatExecutionSnapshot({ ...talent, wechat: "" }, null), {
    error: "请先填写达人微信号",
    ok: false,
  });
});

test("renders the immutable task preview from the selected level template", () => {
  const result = prepareWechatExecutionSnapshot({
    nickname: "  Pemi美妆  ",
    platform: "douyin",
    platformAccount: "pemi-account",
    talentLevel: "A",
    wechat: "Pemi-pro",
  }, {
    enabled: true,
    greetingMessage: "你好{nickname}，账号{account}",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.deepEqual(result.snapshot, {
      expectedNickname: "Pemi美妆",
      greetingMessage: "你好Pemi美妆，账号pemi-account",
      remark: "Pemi美妆",
      talentLevel: "A",
      wechatId: "Pemi-pro",
    });
  }
});
