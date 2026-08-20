import Link from "next/link";
import { redirect } from "next/navigation";

import { TaskActions } from "@/components/tasks/task-actions";
import {
  getTaskStatusLabel,
  getTaskTypeLabel,
  TASK_STATUSES,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

const sectionStyles = {
  pending: "border-amber-200 bg-amber-50 text-amber-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-slate-200 bg-slate-50 text-slate-600",
} as const;

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  const { data: tasks, error } = await supabase
    .from("tasks")
    .select(
      "id, talent_id, task_type, status, due_at, notes, talents!tasks_talent_owner_fk(nickname)",
    )
    .eq("user_id", userId)
    .order("due_at", { ascending: true });

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
                            <th className="px-5 py-3">达人昵称</th>
                            <th className="px-4 py-3">任务类型</th>
                            <th className="px-4 py-3">状态</th>
                            <th className="px-4 py-3">到期时间</th>
                            <th className="px-4 py-3">备注</th>
                            <th className="px-5 py-3 text-right">操作</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf0ee]">
                          {statusTasks.map((task) => (
                            <tr key={task.id}>
                              <td className="px-5 py-4 font-medium text-[#35443e]">
                                <Link
                                  className="hover:text-[#31594b] hover:underline"
                                  href={`/talents/${task.talent_id}`}
                                >
                                  {task.talents?.nickname ?? "未知达人"}
                                </Link>
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {getTaskTypeLabel(task.task_type)}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {getTaskStatusLabel(task.status)}
                              </td>
                              <td className="px-4 py-4 text-slate-600">
                                {formatDateTime(task.due_at)}
                              </td>
                              <td className="max-w-64 truncate px-4 py-4 text-slate-500">
                                {task.notes || "—"}
                              </td>
                              <td className="px-5 py-4 text-right">
                                {task.status === "pending" ? (
                                  <div className="flex justify-end">
                                    <TaskActions
                                      returnTo="tasks"
                                      talentId={task.talent_id}
                                      taskId={task.id}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">已结束</span>
                                )}
                              </td>
                            </tr>
                          ))}
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
