import { z } from "zod";

const agentVersionSchema = z
  .string()
  .trim()
  .min(1, "Agent version is required")
  .max(50, "Agent version must not exceed 50 characters")
  .regex(/^[A-Za-z0-9][A-Za-z0-9._+-]*$/, "Agent version contains unsupported characters");

export const registerAgentInstanceSchema = z.object({
  agent_type: z.literal("windows"),
  device_name: z.string().trim().min(1, "Device name is required").max(100),
  installation_id: z.uuid(),
  version: agentVersionSchema,
}).strict();

export const heartbeatAgentInstanceSchema = z.object({
  status: z.enum(["active", "paused"]),
  version: agentVersionSchema,
}).strict();

export const agentInstanceParamsSchema = z.object({ id: z.uuid() });
