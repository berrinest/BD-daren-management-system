"use client";

import { useEffect } from "react";

const REQUEST_SOURCE = "bd-capture-extension";
const RESPONSE_SOURCE = "bd-capture-web";

export function BrowserCaptureBridge() {
  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const request = event.data as { payload?: unknown; requestId?: unknown; source?: unknown; type?: unknown } | null;
      if (request?.source !== REQUEST_SOURCE || request.type !== "captureTalentResource" || typeof request.requestId !== "string") return;

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 15000);
      let response: { error?: string | null; message?: string | null; ok: boolean; status: number };
      try {
        const result = await fetch("/api/resources/capture", {
          body: JSON.stringify(request.payload),
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          method: "POST",
          signal: controller.signal,
        });
        const data = await result.json().catch(() => ({}));
        response = {
          error: data.error || null,
          message: data.message || null,
          ok: result.ok,
          status: result.status,
        };
      } catch (error) {
        response = {
          error: error instanceof DOMException && error.name === "AbortError"
            ? "BD 系统响应超时，请稍后重试"
            : "无法连接 BD 系统",
          ok: false,
          status: 0,
        };
      } finally {
        window.clearTimeout(timeoutId);
      }
      window.postMessage({ requestId: request.requestId, response, source: RESPONSE_SOURCE, type: "captureTalentResourceResult" }, window.location.origin);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return null;
}
