import assert from "node:assert/strict";
import test from "node:test";

import { formatPowerShellError } from "../dist/executor/powershell.js";

test("PowerShell CLIXML errors are reduced to their readable message", () => {
  const raw = '#< CLIXML\r\n<Objs Version="1.1.0.1"><S S="Error">无法启动微信_x000D__x000A_请设置 BD_WECHAT_PATH</S></Objs>';
  assert.equal(formatPowerShellError(raw), "无法启动微信\n请设置 BD_WECHAT_PATH");
});

test("plain PowerShell stderr is preserved", () => {
  assert.equal(formatPowerShellError("  Access denied  "), "Access denied");
});

test("marked PowerShell errors survive redirected output serialization", () => {
  const encoded = Buffer.from("微信启动失败：找不到客户端", "utf8").toString("base64");
  assert.equal(
    formatPowerShellError(`#< CLIXML\n<Objs><S>__BD_AGENT_ERROR__${encoded}</S></Objs>`),
    "微信启动失败：找不到客户端",
  );
});
