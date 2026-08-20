import { z } from "zod";

import { TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PRIORITIES } from "@/lib/constants";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable(),
);

export const createTalentResourceSchema = z.object({
  nickname: z.string().trim().min(1, "请输入达人昵称").max(100),
  primary_platform: z.enum(TALENT_PLATFORMS),
  platform_account: optionalText(200),
  profile_url: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.url("请输入有效的主页链接").nullable(),
  ),
  wechat: optionalText(100),
  follower_count: z.preprocess(
    (value) => value === "" || value === null ? null : Number(value),
    z.number().int().nonnegative().nullable(),
  ),
  category: z.enum(TALENT_CATEGORIES),
  priority: z.enum(TALENT_PRIORITIES),
  source: optionalText(200),
  notes: optionalText(2000),
});

export const convertTalentResourceSchema = z.object({ resource_id: z.uuid() });

export const updateTalentResourcePrioritySchema = z.object({
  resource_id: z.uuid(),
  priority: z.enum(TALENT_PRIORITIES),
});
