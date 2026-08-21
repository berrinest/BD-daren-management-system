import Link from "next/link";

import { ResourceContactForm } from "@/components/resources/resource-contact-form";
import { TaskActions } from "@/components/tasks/task-actions";
import { CopyButton } from "@/components/ui/copy-button";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  getResourceProcessingStatusLabel,
  getTalentPlatformLabel,
  getTalentPriorityLabel,
  getTalentStageLabel,
  getTaskTypeLabel,
} from "@/lib/constants";
import { getDashboardData } from "@/lib/data/dashboard";
import { formatDateTime } from "@/lib/formatters/date";

import { deferWorkItem } from "./actions";

type Props = {
  searchParams: Promise<{
    autoConverted?: string;
    error?: string;
    notice?: string;
  }>;
};

const timingLabels = { overdue: "已逾期", today: "今日到期", new: "新资源" } as const;

export default async function WorkPage({ searchParams }: Props) {
  const [params, dashboardData] = await Promise.all([searchParams, getDashboardData()]);
  const currentItem = dashboardData.workItems[0];
  const errorMessage = (params.error ?? "").slice(0, 200);
  const notice = ["deferred", "task-completed", "task-cancelled", "resource-completed"].find((value) => value === params.notice);
  const currentItemId = currentItem?.kind === "talent_task" ? currentItem.taskId : currentItem?.resourceId;

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-4xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">DAILY FOCUS</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">开始今日工作</h1><p className="mt-2 text-sm text-slate-500">按工作台顺序逐项处理，完成后自动进入下一项。</p></div><Link className="text-sm font-medium text-[#557064] hover:underline" href="/dashboard">返回今日工作台</Link></div>

    {errorMessage ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{errorMessage}</p> : null}
    {notice === "task-completed" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">达人任务已完成并写入跟进记录，已进入下一项。</p> : null}
    {notice === "task-cancelled" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">达人任务已取消，已进入下一项。</p> : null}
    {notice === "resource-completed" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">资源联系结果已保存{params.autoConverted === "1" ? "，并已自动转为正式达人" : ""}，已进入下一项。</p> : null}
    {notice === "deferred" ? <p className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800" role="status">当前事项已安排到明天上午 10 点，未标记完成，已进入下一项。</p> : null}

    {!currentItem ? <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white px-6 py-16 text-center shadow-sm"><h2 className="text-xl font-semibold text-[#26332e]">今日工作已处理完成</h2><p className="mt-2 text-sm text-slate-500">当前没有逾期、今日到期或新资源事项。</p><Link className="mt-6 inline-flex rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white" href="/dashboard">返回工作台</Link></section> : <>
      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${currentItem.timing === "overdue" ? "bg-red-50 text-red-700" : currentItem.timing === "today" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"}`}>{timingLabels[currentItem.timing]}</span><span className="rounded-full bg-[#eaf3ef] px-2 py-1 text-xs font-semibold text-[#31594b]">{currentItem.kind === "talent_task" ? "达人" : "资源"}</span></div><div className="mt-4 flex items-center gap-2"><h2 className="text-2xl font-semibold text-[#26332e]">{currentItem.nickname}</h2><CopyButton label="复制昵称" value={currentItem.nickname} /></div><p className="mt-2 text-sm text-slate-500">{getTalentPlatformLabel(currentItem.platform)} · {getTalentPriorityLabel(currentItem.priority)}</p></div><div className="text-left sm:text-right"><p className="text-sm font-medium text-[#31594b]">剩余 {dashboardData.workItems.length} 项</p><p className="mt-1 text-xs text-slate-400">完成本项后自动刷新队列</p></div></div>

        {currentItem.kind === "talent_task" ? <>
          <dl className="mt-6 grid gap-3 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">微信号</dt><dd className="mt-1.5 flex items-center justify-between gap-2 text-sm font-medium text-[#35443e]"><span className="truncate">{currentItem.wechat || "未填写"}</span>{currentItem.wechat ? <CopyButton value={currentItem.wechat} /> : null}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">当前阶段</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{getTalentStageLabel(currentItem.state)}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">当前任务</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{getTaskTypeLabel(currentItem.actionType)}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">到期时间</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{currentItem.dueAt ? formatDateTime(currentItem.dueAt) : "未安排"}</dd></div></dl>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#edf0ee] pt-6"><Link className="text-sm font-medium text-[#31594b] hover:underline" href={`/talents/${currentItem.talentId}?task=${currentItem.taskId}&returnTo=work`}>打开达人完整详情 →</Link><div className="flex flex-wrap gap-2">{currentItemId ? <form action={deferWorkItem}><input name="item_id" type="hidden" value={currentItemId} /><input name="item_kind" type="hidden" value="talent_task" /><FormSubmitButton className="rounded-lg border border-[#d6dfda] px-3 py-1.5 text-xs font-medium text-[#31594b] hover:bg-[#f4f6f4] disabled:cursor-not-allowed disabled:opacity-50" label="稍后处理 · 明天10点" pendingLabel="正在安排…" /></form> : null}{currentItem.talentId && currentItem.taskId ? <TaskActions returnTo="work" talentId={currentItem.talentId} taskId={currentItem.taskId} /> : null}</div></div>
        </> : <>
          <dl className="mt-6 grid gap-3 border-t border-[#edf0ee] pt-6 sm:grid-cols-3"><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">微信号</dt><dd className="mt-1.5 flex items-center justify-between gap-2 text-sm font-medium text-[#35443e]"><span className="truncate">{currentItem.wechat || "未填写"}</span>{currentItem.wechat ? <CopyButton value={currentItem.wechat} /> : null}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">处理状态</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{getResourceProcessingStatusLabel(currentItem.state)}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">下次处理时间</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{currentItem.timing === "new" ? "首次处理" : currentItem.dueAt ? formatDateTime(currentItem.dueAt) : "未安排"}</dd></div></dl>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><Link className="text-sm font-medium text-[#31594b] hover:underline" href={`/resources/${currentItem.resourceId}?returnTo=work`}>打开资源完整详情 →</Link>{currentItemId ? <form action={deferWorkItem}><input name="item_id" type="hidden" value={currentItemId} /><input name="item_kind" type="hidden" value="resource" /><FormSubmitButton className="rounded-lg border border-[#d6dfda] px-3 py-2 text-xs font-medium text-[#31594b] hover:bg-[#f4f6f4] disabled:cursor-not-allowed disabled:opacity-50" label="稍后处理 · 明天10点" pendingLabel="正在安排…" /></form> : null}</div>
        </>}
      </section>

      {currentItem.kind === "resource" && currentItem.resourceId ? <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8"><h2 className="text-lg font-semibold text-[#26332e]">记录本次联系</h2><p className="mt-1 text-sm text-slate-500">保存结果后自动进入下一项今日工作。</p><ResourceContactForm resourceId={currentItem.resourceId} workQueue /></section> : null}
    </>}
  </section></main>;
}
