/* global chrome */

if (!globalThis.__BD_CAPTURE_APP_BRIDGE__) {
  globalThis.__BD_CAPTURE_APP_BRIDGE__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "captureTalentResource") return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    void (async () => {
      try {
        const endpoint = new URL(message.endpoint, location.origin);
        if (endpoint.origin !== location.origin || endpoint.pathname !== "/api/resources/capture") {
          throw new Error("采集接口地址无效");
        }
        const response = await fetch(endpoint, {
          body: JSON.stringify(message.payload),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        if (response.redirected && new URL(response.url).pathname === "/login") {
          sendResponse({ error: "请先登录 BD 系统", ok: false, status: 401 });
          return;
        }
        const data = await response.json().catch(() => ({}));
        sendResponse({
          error: data.error || null,
          message: data.message || null,
          ok: response.ok,
          status: response.status,
        });
      } catch (error) {
        sendResponse({
          error: error instanceof DOMException && error.name === "AbortError"
            ? "BD 系统响应超时，请稍后重试"
            : error instanceof Error ? error.message : "无法连接 BD 系统",
          ok: false,
          status: 0,
        });
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    return true;
  });
}
