import { z } from "zod";

import { TALENT_LEVELS } from "@/lib/constants";
import { findUnsupportedTemplateVariables } from "@/lib/tasks/wechat-execution";

function templateText(maximum: number, label: string) {
  return z.string().trim().min(1, `请输入${label}`).max(maximum).superRefine(
    (value, context) => {
      const unsupported = findUnsupportedTemplateVariables(value);
      if (unsupported.length > 0) {
        context.addIssue({
          code: "custom",
          message: `模板中包含不支持的变量：${unsupported.join("、")}`,
        });
      }
    },
  );
}

export const saveWechatMessageTemplateSchema = z.object({
  talent_level: z.enum(TALENT_LEVELS),
  template_name: z.string().trim().min(1, "请输入模板名称").max(100),
  greeting_message: templateText(500, "好友申请招呼语"),
  enabled: z.preprocess(
    (value) => value === true || value === "on" || value === "true",
    z.boolean(),
  ),
});

export type SaveWechatMessageTemplateInput = z.infer<
  typeof saveWechatMessageTemplateSchema
>;
