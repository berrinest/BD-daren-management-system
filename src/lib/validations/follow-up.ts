import { z } from "zod";

import { FOLLOW_UP_METHODS, FOLLOW_UP_RESULTS } from "@/lib/constants";

export const createFollowUpSchema = z.object({
  talent_id: z.uuid(),
  task_id: z.uuid().nullable().optional(),
  occurred_at: z.coerce.date(),
  method: z.enum(FOLLOW_UP_METHODS),
  result: z.enum(FOLLOW_UP_RESULTS),
  notes: z.string().trim().max(2000).nullable().optional(),
});
