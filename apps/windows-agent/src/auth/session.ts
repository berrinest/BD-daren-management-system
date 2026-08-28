import type { LocalAgentConfig } from "../config.js";
import { readRefreshToken, saveRefreshToken } from "./credential-manager.js";

type RefreshResponse = {
  access_token?: string;
  refresh_token?: string;
};

export async function refreshAccessToken(local: LocalAgentConfig, apiBaseUrl: string) {
  return refreshAccessTokenWith(local, apiBaseUrl, {
    fetch: globalThis.fetch,
    readRefreshToken,
    saveRefreshToken,
  });
}

export async function refreshAccessTokenWith(
  local: LocalAgentConfig,
  apiBaseUrl: string,
  dependencies: {
    fetch: typeof globalThis.fetch;
    readRefreshToken: typeof readRefreshToken;
    saveRefreshToken: typeof saveRefreshToken;
  },
) {
  if (!local.supabaseUrl || !local.supabasePublishableKey) {
    throw new Error("Agent 尚未绑定账号，请先运行 pnpm --filter @bd/windows-agent login");
  }
  const refreshToken = await dependencies.readRefreshToken(apiBaseUrl);
  const response = await dependencies.fetch(`${local.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    body: JSON.stringify({ refresh_token: refreshToken }),
    headers: {
      apikey: local.supabasePublishableKey,
      "Content-Type": "application/json",
    },
    method: "POST",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as RefreshResponse | null;
  if (!response.ok || !payload?.access_token || !payload.refresh_token) {
    throw new Error("Agent 登录已失效，请重新运行 pnpm --filter @bd/windows-agent login");
  }
  await dependencies.saveRefreshToken(apiBaseUrl, payload.refresh_token);
  return payload.access_token;
}
