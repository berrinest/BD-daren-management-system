/* global chrome */

if (!globalThis.__BD_CAPTURE_APP_BRIDGE__) {
  globalThis.__BD_CAPTURE_APP_BRIDGE__ = true;

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "agentApiRequest") {
      let endpoint;
      try {
        endpoint = new URL(message.path, location.origin);
      } catch {
        sendResponse({ error: { code: "INVALID_AGENT_REQUEST", message: "Agent 请求地址无效" }, ok: false, status: 400 });
        return false;
      }
      const queryKeys = [...endpoint.searchParams.keys()];
      const isTaskList = message.method === "GET"
        && endpoint.pathname === "/api/agent/tasks"
        && endpoint.searchParams.get("scope") === "today"
        && queryKeys.length === 1;
      const isTaskMutation = message.method === "POST"
        && /^\/api\/agent\/tasks\/[0-9a-f-]{36}\/(claim|result)$/iu.test(endpoint.pathname)
        && !endpoint.search;
      if (endpoint.origin !== location.origin || (!isTaskList && !isTaskMutation)) {
        sendResponse({ error: { code: "AGENT_REQUEST_NOT_ALLOWED", message: "Agent 请求不在允许范围内" }, ok: false, status: 403 });
        return false;
      }

      const requestId = crypto.randomUUID();
      const timeoutId = setTimeout(() => {
        window.removeEventListener("message", handleAgentResult);
        sendResponse({ error: { code: "BD_AGENT_TIMEOUT", message: "BD Agent 响应超时" }, ok: false, status: 0 });
      }, 18000);
      function handleAgentResult(event) {
        const data = event.data;
        if (event.source !== window || event.origin !== location.origin) return;
        if (data?.source !== "bd-agent-web" || data.type !== "agent_response" || data.requestId !== requestId) return;
        clearTimeout(timeoutId);
        window.removeEventListener("message", handleAgentResult);
        sendResponse(data.response);
      }
      window.addEventListener("message", handleAgentResult);
      window.postMessage({
        request: {
          body: message.body,
          method: message.method,
          path: `${endpoint.pathname}${endpoint.search}`,
        },
        requestId,
        source: "bd-agent-extension",
        type: "agent_request",
      }, location.origin);
      return true;
    }

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
