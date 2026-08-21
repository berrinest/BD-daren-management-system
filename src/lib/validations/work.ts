import { z } from "zod";

export const deferWorkItemSchema = z.object({
  item_id: z.uuid(),
  item_kind: z.enum(["resource", "talent_task"]),
});
