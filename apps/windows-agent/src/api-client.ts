export type AgentInstance = {
  id: string;
  device_name: string;
  last_seen_at: string;
  status: "active" | "paused" | "revoked";
  version: string;
};

export type AgentTask = {
  created_at: string;
  due_at: string;
  next_action: string | null;
  status: "in_progress" | "pending";
  target: {
    id: string;
    nickname: string;
    platform: string;
    platform_account: string | null;
    type: "resource" | "talent";
    wechat: string | null;
  };
  task_id: string;
  task_type: "wechat_add_friend";
};

export type AgentTaskClaim = {
  agent_id: string;
  started_at: string;
  status: "in_progress";
  task_id: string;
};

export class BdAgentApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly accessToken: string,
  ) {}

  private async request<T extends object>(path: string, init?: RequestInit) {
    const response = await fetch(`${this.baseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
      },
      ...init,
      signal: AbortSignal.timeout(15_000),
    });
    const payload = await response.json().catch(() => null) as T | {
      error?: { code?: string; message?: string };
    } | null;
    if (!response.ok || !payload) {
      const message = payload && "error" in payload
        ? payload.error?.message
        : `HTTP ${response.status}`;
      throw new Error(message || "BD Agent API request failed");
    }
    return payload as T;
  }

  private post<T extends object>(path: string, body: unknown) {
    return this.request<T>(path, {
      body: JSON.stringify(body),
      method: "POST",
    });
  }

  register(input: {
    deviceName: string;
    installationId: string;
    version: string;
  }) {
    return this.post<{ agent: AgentInstance }>("/api/agent/instances/register", {
      agent_type: "windows",
      device_name: input.deviceName,
      installation_id: input.installationId,
      version: input.version,
    }).then((payload) => payload.agent);
  }

  heartbeat(agentId: string, version: string, status: "active" | "paused") {
    return this.post<{ agent: AgentInstance }>(`/api/agent/instances/${encodeURIComponent(agentId)}/heartbeat`, {
      status,
      version,
    }).then((payload) => payload.agent);
  }

  async getTasks() {
    const payload = await this.request<{ tasks: AgentTask[] }>(
      "/api/agent/tasks?scope=today&task_type=wechat_add_friend",
    );
    return payload.tasks;
  }

  claimTask(taskId: string, agentId: string) {
    return this.post<AgentTaskClaim>(
      `/api/agent/tasks/${encodeURIComponent(taskId)}/claim`,
      { agent_id: agentId },
    );
  }
}
