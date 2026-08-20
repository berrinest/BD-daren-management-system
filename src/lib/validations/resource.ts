import { z } from "zod";

import { RESOURCE_CONTACT_METHODS, RESOURCE_CONTACT_RESULTS, RESOURCE_PROCESSING_STATUSES, TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PRIORITIES } from "@/lib/constants";

const optionalText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable(),
);

const optionalDateTime = z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的下一次处理时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的下一次处理时间")
    .nullable()
    .optional(),
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

export const updateTalentResourceProcessingStatusSchema = z.object({
  resource_id: z.uuid(),
  processing_status: z.enum(RESOURCE_PROCESSING_STATUSES),
  next_action_at: optionalDateTime,
});

const resourceIds = z.array(z.uuid()).min(1, "请至少选择一条资源").max(100, "单次最多处理 100 条资源");

export const bulkUpdateTalentResourcePrioritySchema = z.object({
  resource_ids: resourceIds,
  priority: z.enum(TALENT_PRIORITIES),
});

export const bulkConvertTalentResourcesSchema = z.object({
  resource_ids: resourceIds,
});

export const bulkDeleteTalentResourcesSchema = z.object({
  resource_ids: resourceIds,
});

export const createResourceContactRecordSchema = z.object({
  resource_id: z.uuid(),
  occurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的联系时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的联系时间"),
  method: z.enum(RESOURCE_CONTACT_METHODS),
  result: z.enum(RESOURCE_CONTACT_RESULTS),
  notes: optionalText(2000),
  next_action_at: optionalDateTime,
});
