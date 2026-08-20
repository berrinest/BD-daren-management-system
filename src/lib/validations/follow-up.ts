import { z } from "zod";

import {
  FOLLOW_UP_METHODS,
  FOLLOW_UP_RESULTS,
  TALENT_STAGES,
  TASK_TYPES,
} from "@/lib/constants";

const optionalNullableText = z.preprocess(
  (value) =>
    typeof value === "string" && value.trim() === "" ? null : value,
  z.string().trim().max(2000).nullable().optional(),
);

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z.uuid().nullable().optional(),
);

const optionalDateTime = z.preprocess(
  (value) => (value === "" || value === null ? null : value),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的下次跟进时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的下次跟进时间")
    .nullable()
    .optional(),
);

export const createFollowUpSchema = z.object({
  talent_id: z.uuid(),
  occurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的沟通时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的沟通时间"),
  method: z.enum(FOLLOW_UP_METHODS),
  result: z.enum(FOLLOW_UP_RESULTS),
  notes: optionalNullableText,
});

export const recordFollowUpAndScheduleNextSchema = createFollowUpSchema
  .extend({
    task_id: optionalUuid,
    complete_current_task: z.preprocess(
      (value) => value === "on" || value === "true",
      z.boolean(),
    ),
    next_stage: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.enum(TALENT_STAGES).nullable().optional(),
    ),
    next_task_due_at: optionalDateTime,
    next_task_type: z.enum(TASK_TYPES),
    next_task_notes: optionalNullableText,
    return_to: z.preprocess(
      (value) => (value === "" || value === null ? null : value),
      z.literal("dashboard").nullable().optional(),
    ),
  })
  .superRefine((value, context) => {
    if (value.complete_current_task && !value.task_id) {
      context.addIssue({
        code: "custom",
        message: "请选择要完成的当前任务",
        path: ["task_id"],
      });
    }
  });
