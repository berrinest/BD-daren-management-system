import { randomBytes, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

export type LoginPayload = {
  refreshToken: string;
  state: string;
  supabasePublishableKey: string;
  supabaseUrl: string;
};

function html(message: string) {
  return `<!doctype html><meta charset="utf-8"><title>BD Agent</title><body style="font-family:system-ui;padding:40px"><h1>${message}</h1><p>现在可以关闭此页面并返回终端。</p></body>`;
}

export async function createLoginReceiver(onAuthorized: (payload: LoginPayload) => Promise<void>) {
  const state = randomBytes(32).toString("base64url");
  let settle: ((payload: LoginPayload) => void) | null = null;
  let rejectLogin: ((error: Error) => void) | null = null;
  let handled = false;
  const authorized = new Promise<LoginPayload>((resolve, reject) => {
    settle = resolve;
    rejectLogin = reject;
  });

  const server = createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/callback") {
      response.writeHead(404).end("Not found");
      return;
    }
    if (handled) {
      response.writeHead(409).end("Authorization already handled");
      return;
    }
    if (!request.headers["content-type"]?.startsWith("application/x-www-form-urlencoded")) {
      response.writeHead(415).end("Unsupported content type");
      return;
    }
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk: string) => {
      body += chunk;
      if (body.length > 16_384) request.destroy();
    });
    request.on("end", async () => {
      try {
        const form = new URLSearchParams(body);
        const receivedState = form.get("state") ?? "";
        const expected = Buffer.from(state);
        const received = Buffer.from(receivedState);
        if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
          throw new Error("授权 state 校验失败");
        }
        const payload: LoginPayload = {
          refreshToken: form.get("refresh_token") ?? "",
          state: receivedState,
          supabasePublishableKey: form.get("supabase_publishable_key") ?? "",
          supabaseUrl: form.get("supabase_url") ?? "",
        };
        if (!payload.refreshToken || !payload.supabasePublishableKey || !/^https:\/\//.test(payload.supabaseUrl)) {
          throw new Error("授权响应缺少必要字段");
        }
        handled = true;
        await onAuthorized(payload);
        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" }).end(html("Windows Agent 绑定成功"));
        settle?.(payload);
      } catch (error) {
        const failure = error instanceof Error ? error : new Error("授权失败");
        response.writeHead(400, { "Content-Type": "text/html; charset=utf-8" }).end(html("Windows Agent 绑定失败"));
        rejectLogin?.(failure);
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("无法启动本机授权回调");

  return {
    callbackUrl: `http://127.0.0.1:${address.port}/callback`,
    close: () => server.close(),
    state,
    waitForAuthorization: () => {
      const timeout = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error("登录授权超时，请重试")), 5 * 60_000);
        timer.unref();
      });
      return Promise.race([authorized, timeout]);
    },
  };
}
