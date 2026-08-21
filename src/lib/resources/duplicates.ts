import { createClient } from "@/lib/supabase/server";
import { getResourceIdentityMatches, type ResourceIdentity } from "@/lib/resources/identity";

export type KnownResourceIdentity = ResourceIdentity & {
  id: string;
  kind: "resource" | "talent";
};

export async function getKnownResourceIdentities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const columns = "id,nickname,primary_platform,platform_account,profile_url,wechat";
  const pageSize = 1000;
  const known: KnownResourceIdentity[] = [];
  let offset = 0;

  while (true) {
    const [resourceResult, talentResult] = await Promise.all([
      supabase.from("talent_resources").select(columns).eq("user_id", userId).range(offset, offset + pageSize - 1),
      supabase.from("talents").select(columns).eq("user_id", userId).range(offset, offset + pageSize - 1),
    ]);
    if (resourceResult.error || talentResult.error) return null;

    const resources = resourceResult.data ?? [];
    const talents = talentResult.data ?? [];
    known.push(
      ...resources.map((item) => ({ ...item, kind: "resource" as const })),
      ...talents.map((item) => ({ ...item, kind: "talent" as const })),
    );
    if (resources.length < pageSize && talents.length < pageSize) break;
    offset += pageSize;
  }

  return known;
}

export function findResourceDuplicate(resource: ResourceIdentity, known: KnownResourceIdentity[]) {
  for (const existing of known) {
    const dimensions = getResourceIdentityMatches(resource, existing);
    if (dimensions.length) return { dimensions, existing };
  }
  return null;
}
