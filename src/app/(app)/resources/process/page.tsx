import Link from "next/link";
import { redirect } from "next/navigation";

import { ResourceContactForm } from "@/components/resources/resource-contact-form";
import { ResourceContactTimeline } from "@/components/resources/resource-contact-timeline";
import { CopyButton } from "@/components/ui/copy-button";
import { getResourceProcessingStatusLabel, getTalentPlatformLabel, getTalentPriorityLabel } from "@/lib/constants";
import { formatDateTime, getShanghaiDayRange } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams: Promise<{ after?: string; autoConverted?: string; completed?: string; error?: string; notice?: string; resource?: string; scope?: string; statusUpdated?: string }>;
};

export default async function ResourceProcessPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: resources, error: resourcesError } = await supabase
    .from("talent_resources")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "new")
    .order("priority", { ascending: true })
    .order("discovered_at", { ascending: false });

  if (resourcesError) throw new Error("Resources could not be loaded");

  const resourceList = resources ?? [];
  const tomorrowStart = getShanghaiDayRange().tomorrowStart;
  const processableResources = resourceList.filter((item) =>
    item.processing_status !== "paused" &&
    (params.scope !== "today" || Boolean(item.next_action_at && item.next_action_at < tomorrowStart)),
  );
  const requestedResourceIndex = params.resource
    ? resourceList.findIndex((item) => item.id === params.resource)
    : -1;
  const previousIndex = params.after
    ? resourceList.findIndex((item) => item.id === params.after)
    : -1;
  const requestedResource = requestedResourceIndex >= 0 ? resourceList[requestedResourceIndex] : undefined;
  const currentResource = params.completed === "1"
    ? undefined
    : requestedResource && processableResources.some((item) => item.id === requestedResource.id)
    ? requestedResource
    : params.after && previousIndex >= 0
      ? resourceList.slice(previousIndex + 1).find((item) => processableResources.some((processable) => processable.id === item.id))
      : params.after
        ? undefined
        : processableResources[0];
  const currentPosition = currentResource
    ? processableResources.findIndex((item) => item.id === currentResource.id) + 1
    : 0;
  const nextResource = currentPosition > 0 ? processableResources[currentPosition] : undefined;

  const { data: contactRecords, error: contactRecordsError } = currentResource
    ? await supabase
      .from("resource_contact_records")
      .select("id, occurred_at, method, result, notes")
      .eq("resource_id", currentResource.id)
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
    : { data: [], error: null };

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-5xl">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">FOCUS MODE</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">资源连续处理</h1><p className="mt-2 text-sm text-slate-500">保存一次联系结果后，自动进入下一条待处理资源。</p></div><Link className="text-sm font-medium text-[#557064] hover:underline" href="/dashboard">退出并返回工作台</Link></div>
    {params.error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{params.error}</p> : null}
    {params.notice === "contact-created" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">上一条联系记录已保存{params.statusUpdated === "1" ? "，处理状态和下一次时间已自动更新" : ""}{params.autoConverted === "1" ? "，并已自动转为正式达人" : ""}。{currentResource ? "已进入下一条。" : ""}</p> : null}
    {!currentResource ? <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white px-6 py-16 text-center shadow-sm"><h2 className="text-xl font-semibold text-[#26332e]">本轮资源已处理完成</h2><p className="mt-2 text-sm text-slate-500">可以返回工作台，或重新开始一轮检查。</p><div className="mt-6 flex justify-center gap-3"><Link className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white" href="/dashboard">返回工作台</Link><Link className="rounded-lg border border-[#d6dfda] px-4 py-2.5 text-sm font-medium text-[#31594b]" href="/resources/process">重新开始</Link></div></div> : <>
      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="text-xs text-slate-400">当前第 {currentPosition} / {processableResources.length} 条</p><div className="mt-2 flex items-center gap-2"><h2 className="text-2xl font-semibold text-[#26332e]">{currentResource.nickname}</h2><CopyButton label="复制昵称" value={currentResource.nickname} /></div><p className="mt-2 text-sm text-slate-500">{getTalentPlatformLabel(currentResource.primary_platform)} · {currentResource.category}</p></div><Link className="text-sm font-medium text-[#31594b] hover:underline" href={`/resources/${currentResource.id}`}>查看完整资源详情</Link></div>
        <dl className="mt-6 grid gap-3 border-t border-[#edf0ee] pt-5 sm:grid-cols-2 lg:grid-cols-4"><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">平台账号</dt><dd className="mt-1 flex items-center justify-between gap-2 text-sm font-medium"><span className="truncate">{currentResource.platform_account || "未填写"}</span>{currentResource.platform_account ? <CopyButton value={currentResource.platform_account} /> : null}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">微信号</dt><dd className="mt-1 flex items-center justify-between gap-2 text-sm font-medium"><span className="truncate">{currentResource.wechat || "未填写"}</span>{currentResource.wechat ? <CopyButton value={currentResource.wechat} /> : null}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">优先级</dt><dd className="mt-1 text-sm font-medium">{getTalentPriorityLabel(currentResource.priority)}</dd></div><div className="rounded-xl bg-[#f8faf8] p-4"><dt className="text-xs text-slate-400">处理状态</dt><dd className="mt-1 text-sm font-medium">{getResourceProcessingStatusLabel(currentResource.processing_status)}</dd></div></dl>
        {currentResource.profile_url ? <div className="mt-5 flex flex-wrap items-center gap-3"><a className="text-sm font-medium text-[#31594b] hover:underline" href={currentResource.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a><CopyButton label="复制主页链接" value={currentResource.profile_url} /></div> : null}
        <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{currentResource.notes || "暂无资源备注"}</p>
      </section>
      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8"><h2 className="text-lg font-semibold text-[#26332e]">记录本次联系</h2><ResourceContactForm continueProcessing nextResourceId={nextResource?.id} processingDone={!nextResource} processingScope={params.scope === "today" ? "today" : undefined} resourceId={currentResource.id} /></section>
      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold text-[#26332e]">联系历史</h2><span className="text-xs text-slate-400">最近记录优先</span></div><div className="mt-5">{contactRecordsError ? <p className="text-sm text-red-700">联系历史加载失败，请稍后重试。</p> : <ResourceContactTimeline records={contactRecords ?? []} />}</div>{contactRecords?.[0] ? <p className="mt-2 text-xs text-slate-400">最近联系：{formatDateTime(contactRecords[0].occurred_at)}</p> : null}</section>
    </>}
  </section></main>;
}
