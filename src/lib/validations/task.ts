import { z } from "zod";

import { TASK_TYPES } from "@/lib/constants";

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

export const taskMutationSchema = z.object({
  task_id: z.uuid(),
  talent_id: z.uuid(),
  return_to: z.enum(["tasks", "talent"]),
});
