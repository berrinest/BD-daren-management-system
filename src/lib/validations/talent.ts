import { z } from "zod";

import {
  TALENT_CATEGORIES,
  LEGACY_TALENT_CATEGORIES,
  TALENT_LEVELS,
  TALENT_PLATFORMS,
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

const category = z.preprocess(
  (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value !== "string" || value.trim() === "") return [];
    return [value.trim()];
  },
  z.array(z.enum([...TALENT_CATEGORIES, ...LEGACY_TALENT_CATEGORIES])).length(1, "请选择达人赛道类别"),
);

export const createTalentSchema = z.object({
  nickname: z.string().trim().min(1, "请输入达人昵称").max(100),
  primary_platform: z.enum(TALENT_PLATFORMS, "请选择平台"),
  platform_account: optionalText(200),
  profile_url: optionalUrl,
  wechat: optionalText(100),
  follower_count: optionalFollowerCount,
  talent_level: z.enum(TALENT_LEVELS),
  tags: category,
  stage: z.enum(TALENT_STAGES),
  notes: optionalText(2000),
});

export const batchImportTalentsSchema = z
  .array(createTalentSchema)
  .min(1, "请至少导入一条达人资料")
  .max(500, "单次最多导入 500 条达人资料");

export type CreateTalentInput = z.infer<typeof createTalentSchema>;
