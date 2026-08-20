import Link from "next/link";

import {
  getTalentPlatformLabel,
  getTalentPriorityLabel,
  getTalentStageLabel,
  getTaskTypeLabel,
} from "@/lib/constants";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDateTime } from "@/lib/formatters/date";

export default async function DashboardPage() {
  const { dueTasks, highPriorityTalents, summary } = await getDashboardData();
  const summaryCards = [
    { label: "今日待处理", value: summary.todayTaskCount, hint: "今天到期的任务", style: "bg-[#eaf3ef] text-[#31594b]" },
    { label: "逾期任务", value: summary.overdueTaskCount, hint: "需要优先处理", style: "bg-red-50 text-red-700" },
    { label: "全部待处理", value: summary.pendingTaskCount, hint: "所有 pending 任务", style: "bg-amber-50 text-amber-700" },
  ];

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TODAY</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">今日工作台</h1>
        <p className="mt-2 text-sm text-slate-500">先处理到期任务，再关注高价值达人。</p>

        <section className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="今日任务摘要">
          {summaryCards.map((card) => (
            <article className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm" key={card.label}>
              <div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${card.style}`}>{card.label}</div>
              <p className="mt-4 text-3xl font-semibold text-[#26332e]">{card.value}</p>
              <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm">
          <header className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-4">
            <div><h2 className="font-semibold text-[#35443e]">今日与逾期任务</h2><p className="mt-1 text-xs text-slate-400">按到期时间从早到晚排列</p></div>
            <Link className="text-sm font-medium text-[#31594b] hover:underline" href="/tasks">查看全部任务</Link>
          </header>
          {dueTasks.length === 0 ? (
            <div className="px-6 py-12 text-center"><p className="font-medium text-[#35443e]">今天没有到期任务</p><p className="mt-2 text-sm text-slate-400">可以从高优先级达人中安排下一步。</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-[#f8faf8] text-xs font-semibold text-[#668074]"><tr><th className="px-5 py-3">达人昵称</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">阶段</th><th className="px-4 py-3">任务类型</th><th className="px-4 py-3">到期时间</th><th className="px-5 py-3 text-right">操作</th></tr></thead>
                <tbody className="divide-y divide-[#edf0ee]">
                  {dueTasks.map((task) => (
                    <tr className="hover:bg-[#fbfcfb]" key={task.id}>
                      <td className="px-5 py-4 font-semibold text-[#35443e]">{task.talents.nickname}</td>
                      <td className="px-4 py-4 text-slate-600">{getTalentPlatformLabel(task.talents.primary_platform)}</td>
                      <td className="px-4 py-4 text-slate-600">{getTalentPriorityLabel(task.talents.priority)}</td>
                      <td className="px-4 py-4 text-slate-600">{getTalentStageLabel(task.talents.stage)}</td>
                      <td className="px-4 py-4 text-slate-600">{getTaskTypeLabel(task.task_type)}</td>
                      <td className="px-4 py-4 text-slate-600">{formatDateTime(task.due_at)}</td>
                      <td className="px-5 py-4 text-right"><Link className="inline-flex rounded-lg bg-[#31594b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#284a3e]" href={`/talents/${task.talent_id}?task=${task.id}`}>去处理</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-center justify-between"><div><h2 className="font-semibold text-[#35443e]">高优先级达人</h2><p className="mt-1 text-xs text-slate-400">最多展示最近更新的 8 位达人</p></div><Link className="text-sm font-medium text-[#31594b] hover:underline" href="/talents">查看达人库</Link></div>
          {highPriorityTalents.length === 0 ? (
            <p className="mt-5 rounded-xl border border-dashed border-[#dfe5e1] px-4 py-8 text-center text-sm text-slate-400">暂无高优先级达人</p>
          ) : (
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highPriorityTalents.map((talent) => (
                <Link className="rounded-xl border border-[#e4e9e6] p-4 transition hover:border-[#afc2b9] hover:bg-[#f8faf8]" href={`/talents/${talent.id}`} key={talent.id}>
                  <h3 className="font-semibold text-[#35443e]">{talent.nickname}</h3>
                  <p className="mt-2 text-xs text-slate-500">{getTalentPlatformLabel(talent.primary_platform)} · {getTalentStageLabel(talent.stage)}</p>
                  <span className="mt-3 inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700">{getTalentPriorityLabel(talent.priority)}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
