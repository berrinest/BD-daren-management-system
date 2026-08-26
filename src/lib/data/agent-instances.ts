import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type AgentInstanceStatus = "active" | "paused" | "revoked";

export type AgentInstanceDto = {
  agent_type: "windows";
  created_at: string;
  device_name: string;
  id: string;
  last_seen_at: string;
  status: AgentInstanceStatus;
  updated_at: string;
  version: string;
};

type AgentInstanceMutation = {
  agent_type: "windows";
  device_name: string;
  installation_id: string;
  last_seen_at: string;
  status: "active" | "paused";
  user_id: string;
  version: string;
};

const selection = "id, device_name, agent_type, version, status, last_seen_at, created_at, updated_at";

function agentInstancesTable(supabase: SupabaseClient<Database>) {
  // The migration is intentionally not pushed yet, so generated remote types do
  // not include agent_instances until database approval and type regeneration.
  return supabase.from("agent_instances" as "tasks");
}

export async function listAgentInstances(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const result = await agentInstancesTable(supabase)
    .select(selection)
    .eq("user_id", userId)
    .order("last_seen_at", { ascending: false });
  return result as unknown as {
    data: AgentInstanceDto[] | null;
    error: { message: string } | null;
  };
}

export async function registerAgentInstance(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: Omit<AgentInstanceMutation, "last_seen_at" | "status" | "user_id">,
) {
  const now = new Date().toISOString();
  const mutation: AgentInstanceMutation = {
    ...input,
    last_seen_at: now,
    status: "active",
    user_id: userId,
  };
  const result = await agentInstancesTable(supabase)
    .upsert(mutation as never, { onConflict: "user_id,installation_id" })
    .select(selection)
    .single();
  return result as unknown as {
    data: AgentInstanceDto | null;
    error: { message: string } | null;
  };
}

export async function heartbeatAgentInstance(
  supabase: SupabaseClient<Database>,
  userId: string,
  agentId: string,
  input: Pick<AgentInstanceMutation, "status" | "version">,
) {
  const result = await agentInstancesTable(supabase)
    .update({
      last_seen_at: new Date().toISOString(),
      status: input.status,
      version: input.version,
    } as never)
    .eq("id", agentId)
    .eq("user_id", userId)
    .neq("status", "revoked")
    .select(selection)
    .maybeSingle();
  return result as unknown as {
    data: AgentInstanceDto | null;
    error: { message: string } | null;
  };
}
