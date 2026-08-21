/* global chrome */

const DEFAULT_WEB_APP_URL = "https://bd-daren-management-system.vercel.app";
const fields = {
  category: document.querySelector("#category"),
  debugOutput: document.querySelector("#debug-output"),
  description: document.querySelector("#description"),
  followerCount: document.querySelector("#follower-count"),
  nickname: document.querySelector("#nickname"),
  platform: document.querySelector("#platform"),
  platformAccount: document.querySelector("#platform-account"),
  profileUrl: document.querySelector("#profile-url"),
  status: document.querySelector("#status"),
  webAppUrl: document.querySelector("#web-app-url"),
};
const form = document.querySelector("#capture-form");
const refreshButton = document.querySelector("#refresh");
const sendButton = document.querySelector("#send");

function setStatus(message, error = false) {
  fields.status.textContent = message;
  fields.status.classList.toggle("error", error);
}

function formatFollowerCount(value) {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return "";
  if (count >= 100000000) return `${Number((count / 100000000).toFixed(1))}亿`;
  if (count >= 10000) return `${Number((count / 10000).toFixed(1))}万`;
  return String(Math.round(count));
}

function parseFollowerCount(value) {
  const normalized = String(value ?? "").replaceAll(",", "").trim();
  if (!normalized) return null;
  const match = normalized.match(/^([\d]+(?:\.\d+)?)\s*(万|亿)?$/u);
  if (!match) throw new Error("粉丝数量请填写数字或约数，例如 124.6万");
  const multiplier = match[2] === "亿" ? 100000000 : match[2] === "万" ? 10000 : 1;
  return Math.round(Number(match[1]) * multiplier);
}

async function collectCurrentPage() {
  sendButton.disabled = true;
  setStatus("正在读取当前公开页面…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("无法读取当前标签页");
    const url = new URL(tab.url);
    const profileMatch = url.pathname.match(/^\/user\/([^/?#]+)/u);
    const isDouyin = url.hostname === "douyin.com" || url.hostname.endsWith(".douyin.com");
    if (!isDouyin || !profileMatch?.[1]) throw new Error("请打开达人主页后再采集");
    const response = await chrome.tabs.sendMessage(tab.id, { type: "collectDouyinProfile" });
    if (!response?.ok) throw new Error(response?.error || "页面没有返回可采集信息");
    const { debug, profile } = response;
    fields.nickname.value = profile.nickname;
    fields.platform.value = profile.platform;
    fields.platformAccount.value = profile.platformAccount;
    fields.followerCount.value = formatFollowerCount(profile.followerCount);
    fields.description.value = profile.description;
    fields.profileUrl.value = profile.profileUrl;
    fields.debugOutput.textContent = JSON.stringify(debug, null, 2);
    sendButton.disabled = false;
    setStatus(profile.nickname ? "已读取公开资料，点击采集后在系统中确认保存。" : "未识别到昵称，请手动补充后采集。");
  } catch (error) {
    fields.debugOutput.textContent = "未取得页面调试结果。重新加载扩展后，请刷新达人主页再试。";
    const message = error instanceof Error ? error.message : "页面读取失败";
    setStatus(message.includes("Receiving end does not exist") ? "请刷新当前达人主页后再重新读取" : message, true);
  }
}

async function loadSettings() {
  const stored = await chrome.storage.local.get("webAppUrl");
  fields.webAppUrl.value = stored.webAppUrl || DEFAULT_WEB_APP_URL;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  sendButton.disabled = true;
  setStatus("正在申请项目网站权限…");
  try {
    const baseUrl = new URL(fields.webAppUrl.value.trim());
    if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error("系统地址必须使用 http 或 https");
    const webAppUrl = baseUrl.href.replace(/\/$/, "");
    const originPattern = `${baseUrl.origin}/*`;
    const hasPermission = await chrome.permissions.request({ origins: [originPattern] });
    if (!hasPermission) throw new Error("需要项目网站权限才能后台采集");
    await chrome.storage.local.set({ webAppUrl });
    const followerCount = parseFollowerCount(fields.followerCount.value);
    const payload = {
      category: fields.category.value,
      follower_count: followerCount,
      nickname: fields.nickname.value.trim(),
      notes: fields.description.value.trim(),
      platform_account: fields.platformAccount.value.trim(),
      primary_platform: fields.platform.value,
      profile_url: fields.profileUrl.value,
      priority: "normal",
      source: "浏览器插件采集",
      wechat: null,
    };
    setStatus("正在查找已登录的 BD 系统…");
    const appTabs = await chrome.tabs.query({ url: originPattern });
    const appTab = appTabs.find((tab) => tab.id && tab.url?.startsWith(baseUrl.origin));
    if (!appTab?.id) throw new Error("请先打开并登录 BD 系统，再点击采集");

    const endpoint = `${webAppUrl}/api/resources/capture`;
    setStatus("正在写入资源池…");
    const execution = chrome.scripting.executeScript({
      args: [endpoint, payload],
      func: async (captureEndpoint, capturePayload) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
          const response = await fetch(captureEndpoint, {
            body: JSON.stringify(capturePayload),
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            method: "POST",
            signal: controller.signal,
          });
          if (response.redirected && new URL(response.url).pathname === "/login") {
            return { error: "请先登录 BD 系统", message: null, ok: false, status: 401 };
          }
          const data = await response.json().catch(() => ({}));
          return { error: data.error || null, message: data.message || null, ok: response.ok, status: response.status };
        } catch (error) {
          return {
            error: error instanceof DOMException && error.name === "AbortError" ? "BD 系统响应超时，请稍后重试" : "无法连接 BD 系统",
            message: null,
            ok: false,
            status: 0,
          };
        } finally {
          clearTimeout(timeoutId);
        }
      },
      target: { tabId: appTab.id },
      world: "MAIN",
    });
    const [{ result }] = await Promise.race([
      execution,
      new Promise((_, reject) => setTimeout(() => reject(new Error("后台采集超时，请确认 BD 系统标签页仍然打开")), 20000)),
    ]);
    if (!result?.ok) throw new Error(result?.error || `采集失败（${result?.status ?? "未知状态"}）`);
    setStatus(result.message || "已加入资源池");
    sendButton.textContent = "已采集";
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "后台采集失败", true);
    sendButton.disabled = false;
  }
});

refreshButton.addEventListener("click", collectCurrentPage);
async function initialize() {
  await loadSettings();
  await collectCurrentPage();
}

void initialize();
