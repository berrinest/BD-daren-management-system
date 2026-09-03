"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { saveWechatMessageTemplateSchema } from "@/lib/validations";

export async function saveWechatMessageTemplate(formData: FormData) {
  const input = saveWechatMessageTemplateSchema.safeParse({
    talent_level: formData.get("talent_level"),
    template_name: formData.get("template_name"),
    greeting_message: formData.get("greeting_message"),
    enabled: formData.get("enabled"),
  });
  const rawLevel = formData.get("talent_level");
  const level = rawLevel === "A" || rawLevel === "B" || rawLevel === "C"
    ? rawLevel
    : "B";

  if (!input.success) {
    const message = input.error.issues[0]?.message ?? "请检查模板内容";
    redirect(`/settings?${new URLSearchParams({ templateError: message, level })}`);
  }

  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("wechat_message_templates").upsert(
    {
      ...input.data,
      remark_template: "{nickname}",
      user_id: userId,
    },
    { onConflict: "user_id,talent_level" },
  );

  if (error) {
    redirect(`/settings?${new URLSearchParams({
      templateError: "模板保存失败，请稍后重试",
      level: input.data.talent_level,
    })}`);
  }

  revalidatePath("/settings");
  redirect(`/settings?${new URLSearchParams({
    templateNotice: "saved",
    level: input.data.talent_level,
  })}`);
}
