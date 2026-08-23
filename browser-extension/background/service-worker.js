/* global chrome */

const BD_TAB_PATTERNS = [
  "https://bd-daren-management-system.vercel.app/*",
  "http://localhost/*",
  "http://127.0.0.1/*",
];
const AGENT_VERSION = chrome.runtime.getManifest().version;

async function getAgentConfig() {
  const stored = await chrome.storage.local.get(["agent_id", "version"]);
  const config = {
    agent_id: typeof stored.agent_id === "string" && stored.agent_id
      ? stored.agent_id
      : crypto.randomUUID(),
    version: AGENT_VERSION,
  };
  if (stored.agent_id !== config.agent_id || stored.version !== config.version) {
    await chrome.storage.local.set(config);
  }
  return config;
}

async function findBdTab() {
  const tabs = await chrome.tabs.query({ url: BD_TAB_PATTERNS });
  return tabs.find((tab) => tab.id && tab.url) ?? null;
}

function localError(code, message) {
  return { error: { code, message }, ok: false, status: 0 };
}

async function requestThroughBdTab(method, path, body) {
  const tab = await findBdTab();
  if (!tab?.id) {
    return localError("BD_TAB_NOT_FOUND", "请打开 BD 系统并登录");
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, {
      body,
      method,
      path,
      type: "agentApiRequest",
    });
    return response ?? localError("BD_BRIDGE_EMPTY", "BD 系统没有返回结果");
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return localError(
      "BD_BRIDGE_UNAVAILABLE",
      message.includes("Receiving end does not exist") || message.includes("Could not establish connection")
        ? "连接脚本未加载，请刷新 BD 系统标签页"
        : "无法连接 BD 系统标签页",
    );
  }
}

async function handleAgentMessage(message) {
  if (message?.type === "GET_AGENT_STATE") {
    const [config, tab] = await Promise.all([getAgentConfig(), findBdTab()]);
    return { config, connected: Boolean(tab), ok: true, status: 200 };
  }

  if (message?.type === "GET_TASKS") {
    return requestThroughBdTab("GET", "/api/agent/tasks?scope=today");
  }

  if (message?.type === "CLAIM_TASK") {
    const config = await getAgentConfig();
    return requestThroughBdTab(
      "POST",
      `/api/agent/tasks/${encodeURIComponent(message.task_id ?? "")}/claim`,
      { agent_id: config.agent_id },
    );
  }

  if (message?.type === "SUBMIT_RESULT") {
    return requestThroughBdTab(
      "POST",
      `/api/agent/tasks/${encodeURIComponent(message.task_id ?? "")}/result`,
      message.result,
    );
  }

  return localError("UNKNOWN_AGENT_MESSAGE", "不支持的 Agent 操作");
}

chrome.runtime.onInstalled.addListener(() => {
  void getAgentConfig();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type || ![
    "GET_AGENT_STATE",
    "GET_TASKS",
    "CLAIM_TASK",
    "SUBMIT_RESULT",
  ].includes(message.type)) return false;

  void handleAgentMessage(message)
    .then(sendResponse)
    .catch(() => sendResponse(localError("AGENT_REQUEST_FAILED", "Agent 请求失败")));
  return true;
});
