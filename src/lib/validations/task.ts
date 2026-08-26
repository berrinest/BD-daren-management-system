import { z } from "zod";

import {
  FOLLOW_UP_RESULTS,
  RESOURCE_CONTACT_RESULTS,
  TASK_TYPES,
} from "@/lib/constants";

const optionalTaskExecutionText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(max).nullable().optional(),
);

const optionalTaskExecutionDateTime = z.preprocess(
  (value) => value === "" || value === null ? null : value,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的下一步时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的下一步时间")
    .nullable()
    .optional(),
);

export const createTaskSchema = z.object({
  talent_id: z.uuid(),
  task_type: z.enum(TASK_TYPES),
  due_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的到期时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的到期时间"),
  notes: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(2000).nullable().optional(),
  ),
});

export const bulkCreateResourceTasksSchema = z.object({
  resource_ids: z
    .array(z.uuid())
    .min(1, "请至少选择一条资源")
    .max(100, "单次最多创建 100 条任务"),
  task_type: z.enum(TASK_TYPES),
  due_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的执行时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的执行时间"),
  notes: z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(2000, "任务备注不能超过 2000 个字符").nullable().optional(),
  ),
  next_action: z
    .string()
    .trim()
    .min(1, "请填写下一步动作")
    .max(500, "下一步动作不能超过 500 个字符"),
});

export const executeBdTaskSchema = z.object({
  task_id: z.uuid(),
  result: z.union([
    z.enum(FOLLOW_UP_RESULTS),
    z.enum(RESOURCE_CONTACT_RESULTS),
  ]),
  notes: optionalTaskExecutionText(2000),
  next_action: optionalTaskExecutionText(500),
  next_action_at: optionalTaskExecutionDateTime,
});

export const recoverInProgressTaskSchema = z.object({
  task_id: z.uuid(),
});

export const taskMutationSchema = z.object({
  task_id: z.uuid(),
  talent_id: z.uuid(),
  return_to: z.enum(["dashboard", "tasks", "talent", "work"]),
});
