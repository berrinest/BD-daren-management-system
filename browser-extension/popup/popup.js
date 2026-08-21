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

function extractDouyinProfile(expectedProfileId) {
  const pageMatch = location.pathname.match(/^\/user\/([^/?#]+)/u);
  let pageProfileId = "";
  try {
    pageProfileId = pageMatch?.[1] ? decodeURIComponent(pageMatch[1]) : "";
  } catch {
    throw new Error("请打开达人主页后再采集");
  }
  if (!pageProfileId || pageProfileId !== expectedProfileId) throw new Error("请打开达人主页后再采集");

  const profileRegion = document.querySelector("main") || document.querySelector('[role="main"]');
  const profileText = profileRegion?.innerText?.slice(0, 120000) ?? "";
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

  const identifierKeys = ["secUid", "sec_uid", "secUserId", "sec_user_id"];
  const readValue = (root, keys, maxDepth = 4) => {
    const queue = [{ depth: 0, value: root }];
    let inspected = 0;
    while (queue.length && inspected < 1000) {
      const { depth, value } = queue.shift();
      inspected += 1;
      if (!value || typeof value !== "object") continue;
      for (const key of keys) {
        const found = value[key];
        if (typeof found === "string" || typeof found === "number") return found;
      }
      if (depth >= maxDepth) continue;
      for (const child of Object.values(value)) if (child && typeof child === "object") queue.push({ depth: depth + 1, value: child });
    }
    return null;
  };
  const findTargetProfile = (root) => {
    const stack = [root];
    let inspected = 0;
    while (stack.length && inspected < 20000) {
      const current = stack.pop();
      inspected += 1;
      if (!current || typeof current !== "object") continue;
      const isTarget = identifierKeys.some((key) => String(current[key] ?? "") === expectedProfileId);
      if (isTarget) return current;
      for (const value of Object.values(current)) if (value && typeof value === "object") stack.push(value);
    }
    return null;
  };

  let structured = null;
  const jsonSources = [];
  const renderData = document.querySelector("#RENDER_DATA")?.textContent?.trim();
  if (renderData) jsonSources.push({ encoded: true, value: renderData });
  for (const script of document.querySelectorAll('script[type="application/json"], script#__NEXT_DATA__')) {
    const value = script.textContent?.trim();
    if (value && value.length <= 3000000 && value !== renderData) jsonSources.push({ encoded: false, value });
    if (jsonSources.length >= 30) break;
  }
  for (const source of jsonSources) {
    try {
      const root = JSON.parse(source.encoded ? decodeURIComponent(source.value) : source.value);
      structured = findTargetProfile(root);
      if (structured) break;
    } catch {
      // Ignore malformed or unrelated embedded state and continue with public fallbacks.
    }
  }

  const title = getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') || document.title;
  const rawNicknameFromTitle = title.replace(/\s*[-_|]\s*抖音.*$/u, "").replace(/的抖音主页.*$/u, "").trim();
  const nicknameFromTitle = /^(抖音|记录美好生活)$/u.test(rawNicknameFromTitle) ? "" : rawNicknameFromTitle;
  const structuredNickname = readValue(structured, ["nickname", "nickName"]);
  const nickname = clean(
    structuredNickname
      || nicknameFromTitle,
    100,
  );
  const accountMatch = profileText.match(/抖音号\s*[:：]\s*([^\s]+)/u);
  const platformAccount = clean(readValue(structured, ["uniqueId", "unique_id", "shortId", "short_id"]) || accountMatch?.[1], 200);
  const followerMatch = profileText.match(/([\d,.]+(?:\.\d+)?)\s*(万|亿|[wW])?\s*粉丝/u);
  const structuredFollowers = readValue(structured, ["followerCount", "follower_count"]);
  const followerCount = structuredFollowers !== null
    ? parseFollowerCount(structuredFollowers)
    : followerMatch ? parseFollowerCount(followerMatch[1], followerMatch[2]) : null;
  const description = clean(
    readValue(structured, ["signature", "description", "bio"])
      || getMeta('meta[property="og:description"]', 'meta[name="description"]'),
    1000,
  );

  return {
    description,
    followerCount,
    nickname,
    platform: "douyin",
    platformAccount,
    profileUrl: `${location.origin}/user/${encodeURIComponent(pageProfileId)}`,
  };
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
    let profileId = "";
    try {
      profileId = decodeURIComponent(profileMatch[1]);
    } catch {
      throw new Error("请打开达人主页后再采集");
    }
    const [{ result }] = await chrome.scripting.executeScript({ args: [profileId], target: { tabId: tab.id }, func: extractDouyinProfile });
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
