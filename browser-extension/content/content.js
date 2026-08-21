/* global chrome */

const DEBUG_KEYWORDS = ["user", "uniqueId", "follower", "fans", "nickname", "secUid"];

function decodeProfileId(pathname) {
  const match = pathname.match(/^\/user\/([^/?#]+)/u);
  if (!match?.[1]) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function readPageDebug(profileId, visibleText) {
  const scriptSnippets = [];
  const scripts = Array.from(document.scripts);

  for (let index = 0; index < scripts.length; index += 1) {
    const raw = scripts[index].textContent?.trim();
    if (!raw || raw.length > 5000000) continue;

    let searchable = raw;
    if (!searchable.includes(profileId)) {
      try {
        searchable = decodeURIComponent(raw);
      } catch {
        continue;
      }
    }
    const profileIndex = searchable.indexOf(profileId);
    if (profileIndex < 0) continue;

    const targetWindow = searchable.slice(Math.max(0, profileIndex - 5000), profileIndex + profileId.length + 5000);
    const matchedKeywords = DEBUG_KEYWORDS.filter((keyword) => targetWindow.toLowerCase().includes(keyword.toLowerCase()));
    if (!matchedKeywords.length) continue;

    const snippets = [];
    const targetProfileIndex = Math.min(5000, profileIndex);
    for (const keyword of matchedKeywords) {
      const lowerWindow = targetWindow.toLowerCase();
      const lowerKeyword = keyword.toLowerCase();
      const positions = [];
      let position = lowerWindow.indexOf(lowerKeyword);
      while (position >= 0) {
        positions.push(position);
        position = lowerWindow.indexOf(lowerKeyword, position + lowerKeyword.length);
      }
      const keywordIndex = positions.sort((left, right) => Math.abs(left - targetProfileIndex) - Math.abs(right - targetProfileIndex))[0];
      snippets.push(targetWindow.slice(Math.max(0, keywordIndex - 180), keywordIndex + keyword.length + 420));
    }
    scriptSnippets.push({
      id: scripts[index].id || null,
      index,
      keywords: matchedKeywords,
      snippets,
      type: scripts[index].type || "text/javascript",
    });
  }

  return {
    documentTitle: document.title,
    matchedScriptCount: scriptSnippets.length,
    profileId,
    scriptSnippets,
    url: location.href,
    visibleText: visibleText.slice(0, 5000),
  };
}

function collectDouyinProfile() {
  const profileId = decodeProfileId(location.pathname);
  const isDouyin = location.hostname === "douyin.com" || location.hostname.endsWith(".douyin.com");
  if (!isDouyin || !profileId) throw new Error("请打开达人主页后再采集");

  const profileRegion = document.querySelector("main") || document.querySelector('[role="main"]');
  const visibleText = profileRegion?.innerText ?? "";
  const getMeta = (...selectors) => selectors
    .map((selector) => document.querySelector(selector)?.getAttribute("content")?.trim())
    .find(Boolean) ?? "";
  const clean = (value, max) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  const parseFollowerCount = (rawValue, unit = "") => {
    const normalized = String(rawValue ?? "").replaceAll(",", "").trim();
    const match = normalized.match(/^([\d.]+)\s*(万|亿|[wW])?/u);
    const value = Number(match?.[1] ?? normalized);
    if (!Number.isFinite(value) || value < 0) return null;
    const normalizedUnit = (unit || match?.[2] || "").toLowerCase();
    if (normalizedUnit === "万" || normalizedUnit === "w") return Math.round(value * 10000);
    if (normalizedUnit === "亿") return Math.round(value * 100000000);
    return Math.round(value);
  };

  const title = getMeta('meta[property="og:title"]', 'meta[name="twitter:title"]') || document.title;
  const rawNickname = title.replace(/\s*[-_|]\s*抖音.*$/u, "").replace(/的抖音主页.*$/u, "").trim();
  const nickname = /^(抖音|记录美好生活)$/u.test(rawNickname) ? "" : clean(rawNickname, 100);
  const metaDescription = getMeta('meta[property="og:description"]', 'meta[name="description"]');
  const publicProfileText = `${visibleText}\n${metaDescription}`;
  const accountMatch = publicProfileText.match(/抖音号\s*[:：]\s*([^\s,，;；]+)/u);
  const followerMatch = publicProfileText.match(/([\d,.]+(?:\.\d+)?)\s*(万|亿|[wW])?\s*粉丝/u)
    || publicProfileText.match(/粉丝(?:数|量)?\s*[:：]?\s*([\d,.]+(?:\.\d+)?)\s*(万|亿|[wW])?/u);

  return {
    debug: readPageDebug(profileId, visibleText),
    profile: {
      description: clean(metaDescription, 1000),
      followerCount: followerMatch ? parseFollowerCount(followerMatch[1], followerMatch[2]) : null,
      nickname,
      platform: "douyin",
      platformAccount: clean(accountMatch?.[1], 200),
      profileUrl: `${location.origin}/user/${encodeURIComponent(profileId)}`,
    },
  };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "collectDouyinProfile") return false;
  try {
    sendResponse({ ok: true, ...collectDouyinProfile() });
  } catch (error) {
    sendResponse({ ok: false, error: error instanceof Error ? error.message : "页面读取失败" });
  }
  return false;
});
