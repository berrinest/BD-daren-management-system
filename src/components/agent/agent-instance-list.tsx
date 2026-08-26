"use client";

import { useEffect, useState } from "react";

import type { AgentInstanceDto } from "@/lib/data/agent-instances";
import { formatDateTime } from "@/lib/formatters/date";

const statusLabels = {
  active: "运行中",
  paused: "已暂停",
  revoked: "已停用",
} as const;

export function AgentInstanceList({ initialAgents }: { initialAgents: AgentInstanceDto[] }) {
  const [agents, setAgents] = useState(initialAgents);
  const [now, setNow] = useState(0);
  const [refreshFailed, setRefreshFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/agent/instances", { cache: "no-store" });
        const payload = await response.json() as { agents?: AgentInstanceDto[] };
        if (!response.ok || !payload.agents) throw new Error("Agent refresh failed");
        if (active) {
          setAgents(payload.agents);
          setNow(Date.now());
          setRefreshFailed(false);
        }
      } catch {
        if (active) {
          setNow(Date.now());
          setRefreshFailed(true);
        }
      }
    }

    void refresh();
    const interval = window.setInterval(() => void refresh(), 10_000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  if (agents.length === 0) {
    return (
      <section className="mt-6 rounded-2xl border border-dashed border-[#d6dfda] bg-white px-6 py-14 text-center shadow-sm">
        <h2 className="font-semibold text-[#35443e]">尚未绑定 Windows Agent</h2>
        <p className="mt-2 text-sm text-slate-500">启动本地 CLI 并完成注册后，设备会自动显示在这里。</p>
      </section>
    );
  }

  return (
    <div className="mt-6 grid gap-4">
      {refreshFailed ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">
          实时状态刷新失败，当前显示最近一次成功获取的数据。
        </p>
      ) : null}
      {agents.map((agent) => {
        const online = now > 0
          && agent.status === "active"
          && now - new Date(agent.last_seen_at).getTime() <= 75_000;
        return (
          <article className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm" key={agent.id}>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-[#26332e]">{agent.device_name}</h2>
                  <span className={`rounded-full px-2 py-1 text-xs font-semibold ${online ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {now === 0 ? "检查中" : online ? "在线" : "离线"}
                  </span>
                  <span className="rounded-full bg-[#eaf3ef] px-2 py-1 text-xs font-semibold text-[#31594b]">
                    {statusLabels[agent.status]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">Windows · v{agent.version}</p>
              </div>
              <div className="text-sm text-slate-500 sm:text-right">
                <p>最近心跳</p>
                <p className="mt-1 font-medium text-[#35443e]">{formatDateTime(agent.last_seen_at)}</p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
