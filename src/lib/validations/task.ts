import { z } from "zod";

import { TASK_TYPES } from "@/lib/constants";

export const createTaskSchema = z.object({
  talent_id: z.uuid(),
  task_type: z.enum(TASK_TYPES),
  due_at: z.coerce.date(),
  notes: z.string().trim().max(2000).nullable().optional(),
});
