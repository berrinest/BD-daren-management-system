import { z } from "zod";

import {
  TALENT_PLATFORMS,
  TALENT_PRIORITIES,
  TALENT_STAGES,
} from "@/lib/constants";

const optionalText = (maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(maximum).nullable(),
  );

const optionalUrl = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.url("请输入有效的主页链接").nullable(),
);

const optionalFollowerCount = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? Number(value) : value;
}, z.number().int("粉丝数必须是整数").nonnegative("粉丝数不能小于 0").nullable());

const tags = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || value.trim() === "") return [];
    return [...new Set(value.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean))];
  },
  z.array(z.string().max(30, "单个标签不能超过 30 个字符")).max(20, "最多添加 20 个标签"),
);

export const createTalentSchema = z.object({
  nickname: z.string().trim().min(1, "请输入达人昵称").max(100),
  primary_platform: z.enum(TALENT_PLATFORMS, "请选择平台"),
  platform_account: optionalText(200),
  profile_url: optionalUrl,
  wechat: optionalText(100),
  follower_count: optionalFollowerCount,
  tags,
  priority: z.enum(TALENT_PRIORITIES),
  stage: z.enum(TALENT_STAGES),
  notes: optionalText(2000),
});

export type CreateTalentInput = z.infer<typeof createTalentSchema>;
