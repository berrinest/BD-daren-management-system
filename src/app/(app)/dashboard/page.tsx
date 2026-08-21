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
import { searchBdRecords } from "@/lib/data/unified-search";
import { formatDateTime } from "@/lib/formatters/date";

const timingLabels = { overdue: "已逾期", today: "今日到期", new: "新资源" } as const;

type Props = { searchParams: Promise<{ error?: string; notice?: string; q?: string }> };

export default async function DashboardPage({ searchParams }: Props) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 100);
  const [{ staleResources, staleTalents, summary, workItems }, searchResults] = await Promise.all([
    getDashboardData(),
    searchBdRecords(search),
  ]);
  const errorMessage = (params.error ?? "").slice(0, 200);
  const notice = ["task-completed", "task-cancelled"].find((value) => value === params.notice);
  const summaryItems = [
    { label: "逾期待处理", value: summary.overdueCount, hint: "达人任务与资源", style: "bg-red-50 text-red-700" },
    { label: "今日达人任务", value: summary.todayTaskCount, hint: "今天到期", style: "bg-[#eaf3ef] text-[#31594b]" },
    { label: "到期资源", value: summary.dueResourceCount, hint: "需要继续联系", style: "bg-amber-50 text-amber-700" },
    { label: "新资源", value: summary.newResourceCount, hint: "尚未安排首次处理", style: "bg-sky-50 text-sky-700" },
  ];

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TODAY</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">今日工作台</h1><p className="mt-2 text-sm text-slate-500">从上往下处理：逾期优先，再处理今日到期和新资源。</p></div><div className="flex flex-wrap gap-2"><Link className="rounded-lg border border-[#31594b] px-3 py-2 text-xs font-semibold text-[#31594b]" href="/resources">录入资源</Link><Link className="rounded-lg bg-[#31594b] px-4 py-2 text-xs font-semibold text-white" href="/work">开始今日工作</Link></div></div>
    <form className="mt-5 flex gap-2 rounded-2xl border border-[#e1e7e3] bg-white p-3 shadow-sm"><input className="min-w-0 flex-1 rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue={search} name="q" placeholder="统一搜索达人或资源昵称" /><button className="rounded-lg border border-[#31594b] px-4 py-2.5 text-sm font-semibold text-[#31594b]" type="submit">搜索</button>{search ? <Link className="rounded-lg px-3 py-2.5 text-sm text-slate-500 hover:bg-[#f4f6f4]" href="/dashboard">清除</Link> : null}</form>
    {search ? <section className="mt-3 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm"><header className="flex items-center justify-between border-b border-[#edf0ee] px-5 py-3"><h2 className="text-sm font-semibold text-[#35443e]">“{search}”的搜索结果</h2><span className="text-xs text-slate-400">{searchResults.length} 条</span></header>{searchResults.length === 0 ? <p className="px-5 py-8 text-center text-sm text-slate-400">未找到匹配的达人或资源</p> : <div className="grid gap-2 p-3 sm:grid-cols-2">{searchResults.map((result) => { const isTalent = result.kind === "talent"; return <Link className="flex items-center justify-between gap-3 rounded-xl border border-[#e7ebe8] p-3 hover:bg-[#f8faf8]" href={isTalent ? `/talents/${result.id}` : `/resources/${result.id}`} key={`${result.kind}:${result.id}`}><div className="min-w-0"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${isTalent ? "bg-[#eaf3ef] text-[#31594b]" : "bg-sky-50 text-sky-700"}`}>{isTalent ? "达人" : "资源"}</span><strong className="truncate text-sm text-[#35443e]">{result.nickname}</strong></div><p className="mt-1 text-xs text-slate-400">{getTalentPlatformLabel(result.platform)} · {result.secondary || "暂无账号信息"}</p></div><span className="shrink-0 text-xs text-slate-500">{isTalent ? getTalentStageLabel(result.state) : getResourceProcessingStatusLabel(result.state)}</span></Link>; })}</div>}</section> : null}
    {errorMessage ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errorMessage}</p> : null}
    {notice === "task-completed" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">任务已完成并写入跟进记录。</p> : null}
    {notice === "task-cancelled" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">任务已取消。</p> : null}

    <section className="mt-6 flex flex-col gap-5 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between" aria-label="今日工作摘要"><div><p className="text-sm font-medium text-slate-500">今天需要处理</p><p className="mt-1 text-4xl font-semibold text-[#26332e]">{workItems.length}<span className="ml-1 text-base font-medium text-slate-400">项</span></p></div><div className="grid flex-1 grid-cols-2 gap-2 lg:max-w-3xl lg:grid-cols-4">{summaryItems.map((item) => <div className="rounded-xl bg-[#f8faf8] px-4 py-3" key={item.label}><div className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${item.style}`}>{item.label}</div><p className="mt-2 text-xl font-semibold text-[#35443e]">{item.value}</p><p className="text-[11px] text-slate-400">{item.hint}</p></div>)}</div></section>
    {summary.noPlanResourceCount > 0 ? <Link className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 hover:bg-amber-100" href="/resources?status=new&filter=no_plan"><span><strong>{summary.noPlanResourceCount} 个资源</strong>没有下一步计划</span><span className="text-xs font-semibold">去整理 →</span></Link> : null}

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

    <details className="mt-6 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4"><div><h2 className="font-semibold text-[#35443e]">长期未推进提醒</h2><p className="mt-1 text-xs text-slate-400">达人或资源超过 14 天没有推进，按需展开查看</p></div><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{staleTalents.length + staleResources.length} 项</span></summary><div className="border-t border-[#edf0ee]">{staleTalents.length === 0 && staleResources.length === 0 ? <p className="px-6 py-10 text-center text-sm text-slate-400">当前没有长期停滞的数据</p> : <div className="space-y-5 p-5">{staleTalents.length > 0 ? <section><h3 className="text-xs font-semibold tracking-wide text-[#668074]">达人 · {staleTalents.length}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{staleTalents.map((talent) => <article className="flex items-center justify-between gap-4 rounded-xl border border-[#e4e9e6] p-4" key={talent.id}><div className="min-w-0"><Link className="font-semibold text-[#35443e] hover:underline" href={`/talents/${talent.id}`}>{talent.nickname}</Link><p className="mt-1 text-xs text-slate-500">{getTalentPlatformLabel(talent.platform)} · {getTalentPriorityLabel(talent.priority)} · {getTalentStageLabel(talent.stage)}</p><p className="mt-2 text-xs text-amber-700">最近活动：{formatDateTime(talent.lastActivityAt)}</p></div><Link className="shrink-0 text-xs font-semibold text-[#31594b]" href={`/talents/${talent.id}`}>查看 →</Link></article>)}</div></section> : null}{staleResources.length > 0 ? <section><h3 className="text-xs font-semibold tracking-wide text-[#668074]">资源 · {staleResources.length}</h3><div className="mt-3 grid gap-3 sm:grid-cols-2">{staleResources.map((resource) => <article className="flex items-center justify-between gap-4 rounded-xl border border-[#e4e9e6] p-4" key={resource.id}><div className="min-w-0"><Link className="font-semibold text-[#35443e] hover:underline" href={`/resources/${resource.id}`}>{resource.nickname}</Link><p className="mt-1 text-xs text-slate-500">{getTalentPlatformLabel(resource.platform)} · {getTalentPriorityLabel(resource.priority)} · {getResourceProcessingStatusLabel(resource.state)}</p><p className="mt-2 text-xs text-amber-700">最近活动：{formatDateTime(resource.lastActivityAt)}</p></div><Link className="shrink-0 text-xs font-semibold text-[#31594b]" href={`/resources/${resource.id}`}>查看 →</Link></article>)}</div></section> : null}</div>}</div></details>
  </section></main>;
}
