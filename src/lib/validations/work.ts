import { z } from "zod";

import { FOLLOW_UP_METHODS } from "@/lib/constants";

export const QUICK_WORK_RESULTS = [
  "replied",
  "no_response",
  "interested",
  "quote_sent",
  "cooperation",
  "rejected",
] as const;

export const deferWorkItemSchema = z.object({
  item_id: z.uuid(),
  item_kind: z.enum(["resource", "resource_task", "talent_task"]),
});

export const completeWorkTaskWithResultSchema = z.object({
  task_id: z.uuid(),
  talent_id: z.uuid(),
  method: z.enum(FOLLOW_UP_METHODS),
  result: z.enum(QUICK_WORK_RESULTS),
  notes: z.string().trim().max(2000, "备注不能超过 2000 个字符").optional(),
});
