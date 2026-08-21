/* global chrome */

const DEFAULT_WEB_APP_URL = "https://bd-daren-management-system.vercel.app";
const fields = {
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

function extractDouyinProfile() {
  const text = document.body?.innerText?.slice(0, 250000) ?? "";
  const getMeta = (...selectors) => selectors
    .map((selector) => document.querySelector(selector)?.getAttribute("content")?.trim())
    .find(Boolean) ?? "";
  const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const parseFollowerCount = (rawValue, unit = "") => {
    const value = Number(String(rawValue).replaceAll(",", ""));
    if (!Number.isFinite(value) || value < 0) return null;
    const normalizedUnit = unit.toLowerCase();
    if (normalizedUnit === "万" || normalizedUnit === "w") return Math.round(value * 10000);
    if (normalizedUnit === "亿") return Math.round(value * 100000000);
    return Math.round(value);
  };

  let structured = null;
  const renderData = document.querySelector("#RENDER_DATA")?.textContent;
  if (renderData) {
    try {
      const root = JSON.parse(decodeURIComponent(renderData));
      const stack = [root];
      let inspected = 0;
      while (stack.length && inspected < 12000) {
        const current = stack.pop();
        inspected += 1;
        if (!current || typeof current !== "object") continue;
        if (typeof current.nickname === "string" && (current.uniqueId || current.shortId || current.signature || current.followerCount !== undefined)) {
          structured = current;
          break;
        }
        for (const value of Object.values(current)) if (value && typeof value === "object") stack.push(value);
      }
    } catch {
      structured = null;
    }
  }

  const title = getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') || document.title;
  const nicknameFromTitle = title.replace(/\s*[-_|]\s*抖音.*$/u, "").replace(/的抖音主页.*$/u, "").trim();
  const nickname = clean(
    structured?.nickname
      || document.querySelector('[data-e2e="user-title"]')?.textContent
      || document.querySelector('h1')?.textContent
      || nicknameFromTitle,
    100,
  );
  const accountMatch = text.match(/抖音号\s*[:：]\s*([^\s]+)/u);
  const platformAccount = clean(structured?.uniqueId || structured?.shortId || accountMatch?.[1], 200);
  const followerMatch = text.match(/([\d,.]+(?:\.\d+)?)\s*(万|亿|[wW])?\s*粉丝/u);
  const structuredFollowers = structured?.followerCount ?? structured?.follower_count;
  const followerCount = structuredFollowers !== undefined
    ? parseFollowerCount(structuredFollowers)
    : followerMatch ? parseFollowerCount(followerMatch[1], followerMatch[2]) : null;
  const description = clean(
    structured?.signature
      || getMeta('meta[property="og:description"]', 'meta[name="description"]'),
    1000,
  );

  return {
    description,
    followerCount,
    nickname,
    platform: "douyin",
    platformAccount,
    profileUrl: `${location.origin}${location.pathname}`,
  };
}

async function collectCurrentPage() {
  sendButton.disabled = true;
  setStatus("正在读取当前公开页面…");
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error("无法读取当前标签页");
    const url = new URL(tab.url);
    if (!url.hostname.endsWith("douyin.com")) throw new Error("第一阶段仅支持抖音公开达人主页");
    const [{ result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: extractDouyinProfile });
    if (!result) throw new Error("页面没有返回可采集信息");
    fields.nickname.value = result.nickname;
    fields.platform.value = result.platform;
    fields.platformAccount.value = result.platformAccount;
    fields.followerCount.value = result.followerCount ?? "";
    fields.description.value = result.description;
    fields.profileUrl.value = result.profileUrl;
    sendButton.disabled = false;
    setStatus(result.nickname ? "已读取公开资料，请确认后发送。" : "未识别到昵称，请手动补充后发送。");
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "页面读取失败", true);
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
    if (fields.followerCount.value) params.set("follower_count", fields.followerCount.value);
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
