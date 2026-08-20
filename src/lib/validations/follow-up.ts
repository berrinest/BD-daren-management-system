import { z } from "zod";

import { FOLLOW_UP_METHODS, FOLLOW_UP_RESULTS } from "@/lib/constants";

export const createFollowUpSchema = z.object({
  talent_id: z.uuid(),
  occurred_at: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "请选择有效的沟通时间")
    .transform((value) => new Date(`${value}:00+08:00`))
    .refine((value) => !Number.isNaN(value.getTime()), "请选择有效的沟通时间"),
  method: z.enum(FOLLOW_UP_METHODS),
  result: z.enum(FOLLOW_UP_RESULTS),
  notes: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? null : value,
    z.string().trim().max(2000).nullable().optional(),
  ),
});
