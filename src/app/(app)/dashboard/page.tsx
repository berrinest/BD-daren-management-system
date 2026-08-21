import Link from "next/link";

import {
  getFollowUpMethodLabel,
  getFollowUpResultLabel,
  getResourceContactMethodLabel,
  getResourceContactResultLabel,
  getResourceProcessingStatusLabel,
  getTalentPlatformLabel,
  getTalentPriorityLabel,
  getTalentStageLabel,
  getTaskTypeLabel,
} from "@/lib/constants";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDateTime } from "@/lib/formatters/date";

const timingLabels = { overdue: "已逾期", today: "今日到期", new: "新资源" } as const;

type Props = { searchParams: Promise<{ error?: string; notice?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const { staleTalents, summary, workItems } = await getDashboardData();
  const errorMessage = (params.error ?? "").slice(0, 200);
  const notice = ["task-completed", "task-cancelled"].find((value) => value === params.notice);
  const summaryCards = [
    { label: "逾期待处理", value: summary.overdueCount, hint: "达人任务与资源", style: "bg-red-50 text-red-700" },
    { label: "今日达人任务", value: summary.todayTaskCount, hint: "今天到期", style: "bg-[#eaf3ef] text-[#31594b]" },
    { label: "到期资源", value: summary.dueResourceCount, hint: "需要继续联系", style: "bg-amber-50 text-amber-700" },
    { label: "新资源", value: summary.newResourceCount, hint: "尚未安排首次处理", style: "bg-sky-50 text-sky-700" },
  ];

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TODAY</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">今日工作台</h1><p className="mt-2 text-sm text-slate-500">从上往下处理：逾期优先，再处理今日到期和新资源。</p></div><div className="flex flex-wrap gap-2"><Link className="rounded-lg border border-[#31594b] px-3 py-2 text-xs font-semibold text-[#31594b]" href="/resources">录入资源</Link><Link className="rounded-lg bg-[#31594b] px-4 py-2 text-xs font-semibold text-white" href="/work">开始今日工作</Link></div></div>
    {errorMessage ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errorMessage}</p> : null}
    {notice === "task-completed" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">任务已完成并写入跟进记录。</p> : null}
    {notice === "task-cancelled" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">任务已取消。</p> : null}

    <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="今日工作摘要">{summaryCards.map((card) => <article className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm" key={card.label}><div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${card.style}`}>{card.label}</div><p className="mt-4 text-3xl font-semibold text-[#26332e]">{card.value}</p><p className="mt-1 text-xs text-slate-400">{card.hint}</p></article>)}</section>

    <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm">
      <header className="flex flex-col justify-between gap-3 border-b border-[#edf0ee] px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#35443e]">今日统一工作列表</h2><p className="mt-1 text-xs text-slate-400">已按逾期、今日、优先级和时间自动排序</p></div><span className="text-sm font-medium text-[#31594b]">共 {workItems.length} 项</span></header>
      {workItems.length === 0 ? <div className="px-6 py-14 text-center"><p className="font-medium text-[#35443e]">今天没有待处理工作</p><p className="mt-2 text-sm text-slate-400">可以继续录入新资源，或为达人安排任务。</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[1280px] text-left text-sm"><thead className="bg-[#f8faf8] text-xs font-semibold text-[#668074]"><tr><th className="px-5 py-3">紧急程度</th><th className="px-4 py-3">名称</th><th className="px-4 py-3">类型</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">当前状态</th><th className="px-4 py-3">最近联系</th><th className="px-4 py-3">下一步动作</th><th className="px-4 py-3">时间</th><th className="px-5 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-[#edf0ee]">{workItems.map((item) => {
        const isTask = item.kind === "talent_task";
        const href = isTask ? `/talents/${item.talentId}?task=${item.taskId}&returnTo=dashboard` : item.timing === "new" ? `/resources/process?resource=${item.resourceId}` : `/resources/process?scope=today&resource=${item.resourceId}`;
        const state = isTask ? getTalentStageLabel(item.state) : getResourceProcessingStatusLabel(item.state);
        const action = isTask ? getTaskTypeLabel(item.actionType) : item.actionType === "first_resource" ? "首次处理资源" : "继续联系资源";
        const contactSummary = item.recentContact ? `${isTask ? getFollowUpMethodLabel(item.recentContact.method) : getResourceContactMethodLabel(item.recentContact.method)} · ${isTask ? getFollowUpResultLabel(item.recentContact.result) : getResourceContactResultLabel(item.recentContact.result)}` : "暂无联系";
        return <tr className="transition hover:bg-[#fbfcfb]" key={item.id}><td className="px-5 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.timing === "overdue" ? "bg-red-50 text-red-700" : item.timing === "today" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{timingLabels[item.timing]}</span></td><td className="px-4 py-4"><Link className="font-semibold text-[#35443e] hover:text-[#31594b] hover:underline" href={href}>{item.nickname}</Link></td><td className="px-4 py-4"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${isTask ? "bg-[#eaf3ef] text-[#31594b]" : "bg-sky-50 text-sky-700"}`}>{isTask ? "达人" : "资源"}</span></td><td className="px-4 py-4 text-slate-600">{getTalentPlatformLabel(item.platform)}</td><td className="px-4 py-4 text-slate-600">{getTalentPriorityLabel(item.priority)}</td><td className="px-4 py-4 text-slate-600">{state}</td><td className="px-4 py-4"><p className="font-medium text-[#35443e]">{contactSummary}</p><p className="mt-1 text-xs text-slate-400">{item.recentContact ? formatDateTime(item.recentContact.occurredAt) : "尚无时间轴记录"}</p></td><td className="px-4 py-4 font-medium text-[#35443e]">{action}</td><td className="px-4 py-4 text-slate-600">{item.dueAt ? formatDateTime(item.dueAt) : "未安排"}</td><td className="px-5 py-4 text-right"><Link className="inline-flex rounded-lg bg-[#31594b] px-3 py-2 text-xs font-semibold text-white hover:bg-[#284a3e]" href={href}>去处理</Link></td></tr>;
      })}</tbody></table></div>}
    </section>

    <section className="mt-6 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm">
      <header className="flex flex-col justify-between gap-2 border-b border-[#edf0ee] px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold text-[#35443e]">长期未推进提醒</h2><p className="mt-1 text-xs text-slate-400">超过 14 天没有资料更新或沟通，且没有待办任务</p></div><span className="text-sm font-medium text-amber-700">显示 {staleTalents.length} 位</span></header>
      {staleTalents.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-400">当前没有长期停滞的达人</p> : <div className="grid gap-3 p-5 sm:grid-cols-2">{staleTalents.map((talent) => <article className="flex items-center justify-between gap-4 rounded-xl border border-[#e4e9e6] p-4" key={talent.id}><div className="min-w-0"><Link className="font-semibold text-[#35443e] hover:underline" href={`/talents/${talent.id}`}>{talent.nickname}</Link><p className="mt-1 text-xs text-slate-500">{getTalentPlatformLabel(talent.platform)} · {getTalentPriorityLabel(talent.priority)} · {getTalentStageLabel(talent.stage)}</p><p className="mt-2 text-xs text-amber-700">最近活动：{formatDateTime(talent.lastActivityAt)}</p></div><Link className="shrink-0 rounded-lg border border-[#d6dfda] px-3 py-2 text-xs font-semibold text-[#31594b] hover:bg-[#f4f6f4]" href={`/talents/${talent.id}`}>查看</Link></article>)}</div>}
    </section>
  </section></main>;
}
