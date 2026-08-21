/* global chrome */

const DEFAULT_WEB_APP_URL = "https://bd-daren-management-system.vercel.app";
const fields = {
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
  try {
    const baseUrl = new URL(fields.webAppUrl.value.trim());
    if (!['http:', 'https:'].includes(baseUrl.protocol)) throw new Error("系统地址必须使用 http 或 https");
    const webAppUrl = baseUrl.href.replace(/\/$/, "");
    await chrome.storage.local.set({ webAppUrl });
    const params = new URLSearchParams({
      nickname: fields.nickname.value.trim(),
      notes: fields.description.value.trim(),
      platform_account: fields.platformAccount.value.trim(),
      primary_platform: fields.platform.value,
      profile_url: fields.profileUrl.value,
    });
    const followerCount = parseFollowerCount(fields.followerCount.value);
    if (followerCount !== null) params.set("follower_count", String(followerCount));
    await chrome.tabs.create({ url: `${webAppUrl}/resources/capture?${params}` });
    window.close();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "无法打开 Web 系统", true);
  }
});

refreshButton.addEventListener("click", collectCurrentPage);
async function initialize() {
  await loadSettings();
  await collectCurrentPage();
}

void initialize();
