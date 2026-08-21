/* global chrome */

if (!globalThis.__BD_CAPTURE_APP_BRIDGE__) {
  globalThis.__BD_CAPTURE_APP_BRIDGE__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== "captureTalentResource") return false;

    const endpoint = new URL(message.endpoint, location.origin);
    if (endpoint.origin !== location.origin || endpoint.pathname !== "/api/resources/capture") {
      sendResponse({ error: "采集接口地址无效", ok: false, status: 0 });
      return false;
    }

    const requestId = crypto.randomUUID();
    const timeoutId = setTimeout(() => {
      window.removeEventListener("message", handleResult);
      sendResponse({ error: "BD 页面采集桥未响应，请刷新 BD 系统标签页", ok: false, status: 0 });
    }, 18000);
    function handleResult(event) {
      const data = event.data;
      if (event.source !== window || event.origin !== location.origin) return;
      if (data?.source !== "bd-capture-web" || data.type !== "captureTalentResourceResult" || data.requestId !== requestId) return;
      clearTimeout(timeoutId);
      window.removeEventListener("message", handleResult);
      sendResponse(data.response);
    }
    window.addEventListener("message", handleResult);
    window.postMessage({
      payload: message.payload,
      requestId,
      source: "bd-capture-extension",
      type: "captureTalentResource",
    }, location.origin);
    return true;
  });
}
