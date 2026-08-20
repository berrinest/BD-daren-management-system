import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ResourceContactForm } from "@/components/resources/resource-contact-form";
import { ResourceContactTimeline } from "@/components/resources/resource-contact-timeline";
import { getResourceProcessingStatusLabel, getTalentPlatformLabel, getTalentPriorityLabel, RESOURCE_PROCESSING_STATUSES, RESOURCE_PROCESSING_STATUS_LABELS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

import { convertTalentResource, updateTalentResourcePriority, updateTalentResourceProcessingStatus } from "../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
};

export default async function ResourceDetailPage({ params, searchParams }: Props) {
  const [{ id }, message] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: resource, error } = await supabase
    .from("talent_resources")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !resource) notFound();
  const processingStatus = resource.processing_status;
  const { data: contactRecords, error: contactRecordsError } = await supabase
    .from("resource_contact_records")
    .select("id, occurred_at, method, result, notes")
    .eq("resource_id", resource.id)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  const details = [
    ["平台", getTalentPlatformLabel(resource.primary_platform)],
    ["平台账号", resource.platform_account || "未填写"],
    ["赛道", resource.category],
    ["优先级", getTalentPriorityLabel(resource.priority)],
    ["处理状态", getResourceProcessingStatusLabel(processingStatus)],
    ["微信号", resource.wechat || "未填写"],
    ["粉丝数量", resource.follower_count?.toLocaleString("zh-CN") ?? "未填写"],
    ["发现来源", resource.source || "未填写"],
    ["发现时间", formatDateTime(resource.discovered_at)],
  ];

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-4xl">
    <Link className="text-sm font-medium text-[#557064] hover:underline" href="/resources">← 返回资源池</Link>
    {message.error ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{message.error}</p> : null}
    {message.notice === "priority-updated" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">资源处理结果已更新。</p> : null}
    {message.notice === "status-updated" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">资源处理状态已更新。</p> : null}
    {message.notice === "contact-created" ? <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">联系记录已保存。</p> : null}
    <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">RESOURCE PROFILE</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">{resource.nickname}</h1><p className="mt-2 text-sm text-slate-500">{resource.status === "new" ? "等待评估并转入跟进" : "已转换为正式达人"}</p></div>{resource.status === "new" ? <form action={convertTalentResource}><input name="resource_id" type="hidden" value={resource.id} /><button className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]" type="submit">转为正式达人</button></form> : resource.converted_talent_id ? <Link className="rounded-lg border border-[#d6dfda] px-4 py-2.5 text-sm font-medium text-[#31594b]" href={`/talents/${resource.converted_talent_id}`}>查看正式达人</Link> : null}</div>
      <dl className="mt-7 grid gap-4 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-4">{details.map(([label, value]) => <div className="rounded-xl bg-[#f8faf8] p-4" key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{value}</dd></div>)}</dl>
      {resource.profile_url ? <a className="mt-6 inline-flex text-sm font-medium text-[#31594b] hover:underline" href={resource.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a> : null}
      <div className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">资源备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{resource.notes || "暂无备注"}</p></div>
      {resource.status === "new" ? <section className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">快捷标记处理结果</h2><p className="mt-1 text-xs text-slate-400">无需编辑资料，直接更新添加进度或处理优先级。</p><form action={updateTalentResourceProcessingStatus} className="mt-4 flex flex-wrap items-end gap-3"><input name="resource_id" type="hidden" value={resource.id} /><label className="grid gap-1.5 text-sm text-[#35443e]"><span>处理状态</span><select className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2" defaultValue={processingStatus} name="processing_status">{RESOURCE_PROCESSING_STATUSES.map((status) => <option key={status} value={status}>{RESOURCE_PROCESSING_STATUS_LABELS[status]}</option>)}</select></label><button className="rounded-lg bg-[#31594b] px-4 py-2 text-sm font-semibold text-white" type="submit">保存状态</button></form><div className="mt-5 flex flex-wrap gap-2">{TALENT_PRIORITIES.map((priority) => <form action={updateTalentResourcePriority} key={priority}><input name="resource_id" type="hidden" value={resource.id} /><input name="priority" type="hidden" value={priority} /><button aria-pressed={resource.priority === priority} className={`rounded-lg border px-4 py-2 text-sm font-medium ${resource.priority === priority ? "border-[#31594b] bg-[#31594b] text-white" : "border-[#d6dfda] text-[#31594b] hover:bg-[#f4f6f4]"}`} disabled={resource.priority === priority} type="submit">{TALENT_PRIORITY_LABELS[priority]}</button></form>)}</div><p className="mt-4 text-xs text-slate-500">确认需要进入正式 BD 跟进时，使用页面顶部的“转为正式达人”。</p></section> : null}
    </div>
    <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">RESOURCE CONTACT HISTORY</p>
      <h2 className="mt-2 text-xl font-semibold text-[#26332e]">资源联系记录</h2>
      <p className="mt-1 text-sm text-slate-500">记录转为正式达人前的好友申请和联系历史。</p>
      {resource.status === "new" ? <ResourceContactForm resourceId={resource.id} /> : null}
      <div className="mt-6 border-t border-[#edf0ee] pt-6">
        {contactRecordsError ? <p className="text-sm text-red-700">联系记录加载失败，请稍后重试。</p> : <ResourceContactTimeline records={contactRecords ?? []} />}
      </div>
    </section>
  </section></main>;
}
