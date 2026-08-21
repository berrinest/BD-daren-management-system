const TRACKING_PARAMETERS = new Set([
  "from",
  "from_tab_name",
  "share_app_id",
  "share_token",
  "timestamp",
  "utm_campaign",
  "utm_medium",
  "utm_source",
  "xsec_source",
  "xsec_token",
]);

export type ResourceIdentity = {
  nickname: string;
  platform_account: string | null;
  primary_platform: string;
  profile_url: string | null;
  wechat: string | null;
};

export type ResourceIdentityDimension = "主页链接" | "平台账号" | "微信号" | "同平台昵称";

export function normalizeProfileUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMETERS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function resourceIdentityEntries(resource: ResourceIdentity) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const entries = new Map<string, ResourceIdentityDimension>();
  if (resource.profile_url) {
    entries.set(`url:${normalize(normalizeProfileUrl(resource.profile_url) ?? resource.profile_url)}`, "主页链接");
  }
  if (resource.platform_account) entries.set(`account:${resource.primary_platform}:${normalize(resource.platform_account)}`, "平台账号");
  if (resource.wechat) entries.set(`wechat:${normalize(resource.wechat)}`, "微信号");
  entries.set(`name:${resource.primary_platform}:${normalize(resource.nickname)}`, "同平台昵称");
  return entries;
}

export function resourceIdentityKeys(resource: ResourceIdentity) {
  return new Set(resourceIdentityEntries(resource).keys());
}

export function getResourceIdentityMatches(resource: ResourceIdentity, existing: ResourceIdentity) {
  const existingKeys = resourceIdentityKeys(existing);
  return [...resourceIdentityEntries(resource)]
    .filter(([key]) => existingKeys.has(key))
    .map(([, dimension]) => dimension);
}
