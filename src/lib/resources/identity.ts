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

export function resourceIdentityKeys(resource: ResourceIdentity, profileUrlIsPrimary = false) {
  const normalize = (value: string) => value.trim().toLocaleLowerCase();
  const keys = new Set<string>();
  if (resource.profile_url) {
    keys.add(`url:${normalize(normalizeProfileUrl(resource.profile_url) ?? resource.profile_url)}`);
    if (profileUrlIsPrimary) return keys;
  }
  if (resource.platform_account) keys.add(`account:${resource.primary_platform}:${normalize(resource.platform_account)}`);
  if (resource.wechat) keys.add(`wechat:${normalize(resource.wechat)}`);
  keys.add(`name:${resource.primary_platform}:${normalize(resource.nickname)}`);
  return keys;
}
