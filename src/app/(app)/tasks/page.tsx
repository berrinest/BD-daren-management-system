import Link from "next/link";
import { redirect } from "next/navigation";

import { recoverInProgressTask } from "@/app/(app)/tasks/actions";
import { TaskActions } from "@/components/tasks/task-actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  getTaskStatusLabel,
  getTaskTypeLabel,
  TASK_STATUSES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { listAgentInstances } from "@/lib/data/agent-instances";
import { createClient } from "@/lib/supabase/server";

const sectionStyles = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

const agentExecutionLabels: Record<string, string> = {
  claimed: "已领取",
  failed: "执行失败",
  running: "运行中",
};

type TasksPageProps = {
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const [taskResult, agentResult, executionResult] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, talent_id, resource_id, task_type, status, due_at, notes, next_action, agent_id, talents!tasks_talent_owner_fk(nickname, primary_platform, wechat), talent_resources!tasks_resource_owner_fk(nickname, primary_platform, platform_account, wechat)",
      )
      .eq("user_id", userId)
      .order("due_at", { ascending: true }),
    listAgentInstances(supabase, userId),
    supabase
      .from("tasks")
      .select("id, agent_execution_status" as never)
      .eq("user_id", userId),
  ]);
  const { data: tasks, error } = taskResult;
  const agentsById = new Map((agentResult.data ?? []).map((agent) => [agent.id, agent]));
  const executionStates = new Map(
    ((executionResult.data ?? []) as unknown as Array<{
      agent_execution_status: string | null;
      id: string;
    }>).map((task) => [task.id, task.agent_execution_status]),
  );

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">
          TASKS
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">任务中心</h1>
        <p className="mt-2 text-sm text-slate-500">
          查看待处理、已完成和已取消的基础任务。
        </p>

        {params.notice === "recovered" ? (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            任务已恢复为待处理，可以重新进入今日工作队列。
          </p>
        ) : null}
        {params.error ? (
          <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {params.error.slice(0, 200)}
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            任务加载失败，请稍后重试。
          </p>
        ) : null}

        {!error ? (
          <div className="mt-6 grid gap-6">
            {TASK_STATUSES.map((status) => {
              const statusTasks = tasks?.filter((task) => task.status === status) ?? [];

              return (
                <section
                  className="overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm"
                  key={status}
                >
                  <header className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-4">
                    <h2 className="font-semibold text-[#35443e]">
                      {getTaskStatusLabel(status)}
                    </h2>
                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${sectionStyles[status]}`}
                    >
                      {statusTasks.length}
                    </span>
                  </header>
                  {statusTasks.length === 0 ? (
                    <p className="px-5 py-8 text-center text-sm text-slate-400">
                      暂无{getTaskStatusLabel(status)}任务
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="bg-[#f8faf8] text-xs text-[#668074]">
                          <tr>
                            <th className="px-5 py-3">任务对象</th>
                            <th className="px-4 py-3">平台 / 联系方式</th>
                            <th className="px-4 py-3">任务类型</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">到期时间</th>
                            <th className="px-4 py-3">备注</th>
                            <th className="px-5 py-3 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf0ee]">
                          {statusTasks.map((task) => {
                            const executingAgent = task.agent_id
                              ? agentsById.get(task.agent_id)
                              : undefined;
                            const executionState = executionStates.get(task.id);
                            const isTalentTask = Boolean(task.talent_id && task.talents);
                            const target = isTalentTask ? task.talents : task.talent_resources;
                            const href = isTalentTask ? `/talents/${task.talent_id}` : `/resources/${task.resource_id}`;
                            const contact = isTalentTask
                              ? task.talents?.wechat
                              : task.talent_resources?.wechat || task.talent_resources?.platform_account;
                            return <tr key={task.id}>
                              <td className="px-5 py-4 font-medium text-[#35443e]">
                                <Link
                                  className="hover:text-[#31594b] hover:underline"
                                  href={href}
                                >
                                  {target?.nickname ?? "未知对象"}
                                </Link>
                                <p className="mt-1 text-xs font-normal text-slate-400">{isTalentTask ? "正式达人" : "资源"}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                <p>{target?.primary_platform ?? "—"}</p>
                                <p className="mt-1 text-xs text-slate-400">{contact || "未填写联系方式"}</p>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {getTaskTypeLabel(task.task_type)}
                                {task.task_type === "wechat_add_friend" ? (
                                  <p className="mt-1 text-xs font-semibold text-[#668074]">
                                    半自动辅助 · 需人工确认发送
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {getTaskStatusLabel(task.status)}
                                {executionState ? (
                                  <p className={`mt-1 text-xs font-semibold ${executionState === "failed" ? "text-red-600" : "text-sky-700"}`}>
                                    Agent：{agentExecutionLabels[executionState] ?? executionState}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {formatDateTime(task.due_at)}
                              </td>
                              <td className="max-w-64 truncate px-4 py-4 text-slate-500">
                                {task.notes || task.next_action || "—"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {task.status === "pending" && isTalentTask && task.talent_id ? (
                                  <div className="flex justify-end">
                                    <TaskActions
                                      returnTo="tasks"
                                      talentId={task.talent_id}
                                      taskId={task.id}
                                    />
                                  </div>
                                ) : task.status === "pending" ? (
                                  <Link className="text-xs font-semibold text-[#31594b] hover:underline" href={href}>进入资源详情</Link>
                                ) : status === "in_progress" ? (
                                  <form action={recoverInProgressTask} className="flex flex-col items-end gap-1.5">
                                    <input name="task_id" type="hidden" value={task.id} />
                                    <span className="text-xs font-semibold text-sky-700">
                                      {executingAgent
                                        ? `${executingAgent.device_name} · ${executionState ? agentExecutionLabels[executionState] ?? executionState : "执行中"} · ${executingAgent.status === "active" ? "在线" : "离线"}`
                                        : "Agent 执行中"}
                                    </span>
                                    <FormSubmitButton
                                      className="rounded-lg border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-50"
                                      label="恢复待处理"
                                      pendingLabel="正在恢复…"
                                    />
                                  </form>
                                ) : (
                                  <span className="text-xs text-slate-400">已结束</span>
                                )}
                              </td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        ) : null}
      </section>
    </main>
  );
}
