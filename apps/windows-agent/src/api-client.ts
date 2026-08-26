export type AgentInstance = {
  id: string;
  device_name: string;
  last_seen_at: string;
  status: "active" | "paused" | "revoked";
  version: string;
};

type AgentResponse = { agent: AgentInstance };

export class BdAgentApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  private async post(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      body: JSON.stringify(body),
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as AgentResponse | {
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok || !payload || !("agent" in payload)) {
      const message = payload && "error" in payload
        ? payload.error?.message
        : `HTTP ${response.status}`;
      throw new Error(message || "BD Agent API request failed");
    }
    return payload.agent;
  }

  register(input: {
    deviceName: string;
    installationId: string;
    version: string;
  }) {
    return this.post("/api/agent/instances/register", {
      agent_type: "windows",
      device_name: input.deviceName,
      installation_id: input.installationId,
      version: input.version,
    });
  }

  heartbeat(agentId: string, version: string, status: "active" | "paused") {
    return this.post(`/api/agent/instances/${encodeURIComponent(agentId)}/heartbeat`, {
      status,
      version,
    });
  }
}
