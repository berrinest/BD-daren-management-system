import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { findResourceDuplicate, getKnownResourceIdentities } from "@/lib/resources/duplicates";
import { normalizeProfileUrl } from "@/lib/resources/identity";
import { createClient } from "@/lib/supabase/server";
import { createTalentResourceSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin && origin !== requestOrigin) {
    return NextResponse.json({ error: "不允许跨站采集" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "采集数据无法解析" }, { status: 400 });
  }

  const raw = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const input = createTalentResourceSchema.safeParse({
    ...raw,
    profile_url: normalizeProfileUrl(typeof raw.profile_url === "string" ? raw.profile_url : null),
  });
  if (!input.success) {
    return NextResponse.json({ error: input.error.issues[0]?.message ?? "请检查采集资料" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return NextResponse.json({ error: "请先登录 BD 系统" }, { status: 401 });

  const known = await getKnownResourceIdentities(supabase, userId);
  if (!known) return NextResponse.json({ error: "重复检测失败，请稍后重试" }, { status: 500 });
  const duplicate = findResourceDuplicate(input.data, known);
  if (duplicate) {
    return NextResponse.json({
      error: `发现重复资源：${duplicate.dimensions.join("、")}与${duplicate.existing.kind === "resource" ? "资源池" : "达人库"}“${duplicate.existing.nickname}”重复`,
    }, { status: 409 });
  }

  const { data, error } = await supabase
    .from("talent_resources")
    .insert({ ...input.data, user_id: userId })
    .select("id")
    .single();
  if (error || !data) return NextResponse.json({ error: "资源录入失败，请稍后重试" }, { status: 500 });

  revalidatePath("/dashboard");
  revalidatePath("/resources");
  return NextResponse.json({ id: data.id, message: "已加入资源池" }, { status: 201 });
}
