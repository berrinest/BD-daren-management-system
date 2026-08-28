import { saveLocalAuthConfig } from "./config.js";
import { saveRefreshToken } from "./auth/credential-manager.js";
import { createLoginReceiver } from "./auth/login-server.js";
import { runPowerShell, quotePowerShell } from "./executor/powershell.js";

async function main() {
  const apiBaseUrl = process.env.BD_WEB_URL?.trim().replace(/\/$/, "");
  if (!apiBaseUrl || !/^https?:\/\//i.test(apiBaseUrl)) {
    throw new Error("首次登录前请设置 BD_WEB_URL");
  }

  const receiver = await createLoginReceiver(async (payload) => {
    await saveRefreshToken(apiBaseUrl, payload.refreshToken);
    await saveLocalAuthConfig({
      apiBaseUrl,
      supabasePublishableKey: payload.supabasePublishableKey,
      supabaseUrl: payload.supabaseUrl,
    });
  });
  try {
    const connectUrl = new URL("/agent/connect", apiBaseUrl);
    connectUrl.searchParams.set("callback", receiver.callbackUrl);
    connectUrl.searchParams.set("state", receiver.state);
    console.log("正在打开浏览器，请登录 BD 系统并确认绑定…");
    await runPowerShell(`Start-Process ${quotePowerShell(connectUrl.toString())}`, new AbortController().signal);
    await receiver.waitForAuthorization();
    console.log("Windows Agent 已绑定。后续 start 将自动刷新登录状态。");
  } finally {
    receiver.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Agent 登录失败";
  console.error(message);
  process.exitCode = 1;
});
