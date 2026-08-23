"use client";

import { useEffect } from "react";

const REQUEST_SOURCE = "bd-agent-extension";
const RESPONSE_SOURCE = "bd-agent-web";

type AgentBridgeRequest = {
  body?: unknown;
  method?: unknown;
  path?: unknown;
};

function getAllowedRequest(request: AgentBridgeRequest) {
  if (typeof request.method !== "string" || typeof request.path !== "string") return null;
  const endpoint = new URL(request.path, window.location.origin);
  if (endpoint.origin !== window.location.origin) return null;

  const queryKeys = [...endpoint.searchParams.keys()];
  const isTaskList = request.method === "GET"
    && endpoint.pathname === "/api/agent/tasks"
    && endpoint.searchParams.get("scope") === "today"
    && queryKeys.length === 1;
  const isTaskMutation = request.method === "POST"
    && /^\/api\/agent\/tasks\/[0-9a-f-]{36}\/(claim|result)$/iu.test(endpoint.pathname)
    && !endpoint.search;
  if (!isTaskList && !isTaskMutation) return null;

  return {
    body: request.method === "POST" ? JSON.stringify(request.body ?? {}) : undefined,
    method: request.method,
    path: `${endpoint.pathname}${endpoint.search}`,
  };
}

export function BrowserAgentBridge() {
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data as {
        request?: AgentBridgeRequest;
        requestId?: unknown;
        source?: unknown;
        type?: unknown;
      } | null;
      if (
        message?.source !== REQUEST_SOURCE
        || message.type !== "agent_request"
        || typeof message.requestId !== "string"
        || !message.request
      ) return;

      const request = getAllowedRequest(message.request);
      let response: { data?: unknown; error?: unknown; ok: boolean; status: number };
      if (!request) {
        response = {
          error: { code: "AGENT_REQUEST_NOT_ALLOWED", message: "Agent 请求不在允许范围内" },
          ok: false,
          status: 403,
        };
      } else {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 15000);
        try {
          const result = await fetch(request.path, {
            body: request.body,
            credentials: "same-origin",
            headers: request.method === "POST" ? { "Content-Type": "application/json" } : undefined,
            method: request.method,
            signal: controller.signal,
          });
          const data = await result.json().catch(() => ({}));
          response = result.ok
            ? { data, ok: true, status: result.status }
            : { error: data.error ?? { code: "AGENT_API_ERROR", message: "Agent API 请求失败" }, ok: false, status: result.status };
        } catch (error) {
          response = {
            error: {
              code: error instanceof DOMException && error.name === "AbortError" ? "AGENT_API_TIMEOUT" : "AGENT_API_UNAVAILABLE",
              message: error instanceof DOMException && error.name === "AbortError" ? "BD Agent 响应超时" : "无法连接 BD Agent API",
            },
            ok: false,
            status: 0,
          };
        } finally {
          window.clearTimeout(timeoutId);
        }
      }

      window.postMessage({
        requestId: message.requestId,
        response,
        source: RESPONSE_SOURCE,
        type: "agent_response",
      }, window.location.origin);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
