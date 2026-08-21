import Link from "next/link";
import { redirect } from "next/navigation";

import { ResourceTable } from "@/components/resources/resource-table";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { RESOURCE_SOURCE_TYPES, RESOURCE_SOURCE_TYPE_LABELS, TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PLATFORM_LABELS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

import { createTalentResource } from "./actions";

const RESOURCE_FILTERS = ["has_wechat", "no_wechat", "contacted", "uncontacted", "waiting_acceptance", "overdue"] as const;
const RESOURCE_FILTER_LABELS: Record<(typeof RESOURCE_FILTERS)[number], string> = {
  has_wechat: "有微信",
  no_wechat: "无微信",
  contacted: "已联系",
  uncontacted: "未联系",
  waiting_acceptance: "等待通过",
  overdue: "逾期处理",
};

type Props = { searchParams: Promise<{ category?: string; duplicateFields?: string; duplicateId?: string; duplicateKind?: string; duplicateNickname?: string; error?: string; failed?: string; filter?: string; notice?: string; priority?: string; q?: string; status?: string; success?: string }> };

export default async function ResourcesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = TALENT_CATEGORIES.find((value) => value === params.category) ?? "";
  const priority = TALENT_PRIORITIES.find((value) => value === params.priority) ?? "";
  const resourceFilter = RESOURCE_FILTERS.find((value) => value === params.filter) ?? "";
  const status = params.status === "converted" ? "converted" : "new";
  const search = (params.q ?? "").trim().slice(0, 100);
  const successCount = /^\d+$/.test(params.success ?? "") ? Number(params.success) : 0;
  const failedCount = /^\d+$/.test(params.failed ?? "") ? Number(params.failed) : 0;
  const duplicateId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.duplicateId ?? "") ? params.duplicateId : undefined;
  const duplicateKind = params.duplicateKind === "talent" || params.duplicateKind === "resource" ? params.duplicateKind : undefined;
  const duplicateFields = (params.duplicateFields ?? "").slice(0, 100);
  const duplicateNickname = (params.duplicateNickname ?? "").slice(0, 100);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  let query = supabase.from("talent_resources").select("*").eq("user_id", userId).eq("status", status).order("priority").order("discovered_at", { ascending: false });
  if (search) query = query.ilike("nickname", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  if (category) query = query.eq("category", category);
  if (priority) query = query.eq("priority", priority);
  if (resourceFilter === "has_wechat") query = query.not("wechat", "is", null);
  if (resourceFilter === "no_wechat") query = query.is("wechat", null);
  if (resourceFilter === "contacted") query = query.in("processing_status", ["attempted_add", "waiting_acceptance", "contacted"]);
  if (resourceFilter === "uncontacted") query = query.eq("processing_status", "pending_add");
  if (resourceFilter === "waiting_acceptance") query = query.eq("processing_status", "waiting_acceptance");
  if (resourceFilter === "overdue") query = query.lt("next_action_at", new Date().toISOString());
  const { data: resources, error } = await query;

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">DISCOVERY</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">达人资源池</h1><p className="mt-2 text-sm text-slate-500">快速收集新发现的达人，筛选后转换到正式跟进流程。</p></div><Link className="rounded-lg border border-[#31594b] px-4 py-2.5 text-sm font-semibold text-[#31594b]" href="/resources/batch">批量录入</Link></div>
    {params.error ? <div className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"><p>{params.error}</p>{duplicateFields && duplicateNickname && duplicateId && duplicateKind ? <p className="mt-1">重复项：{duplicateFields}；已有{duplicateKind === "talent" ? "达人" : "资源"}“{duplicateNickname}”。<Link className="font-semibold underline" href={duplicateKind === "talent" ? `/talents/${duplicateId}` : `/resources/${duplicateId}`}>查看已有信息</Link></p> : null}</div> : null}
    {params.notice === "created" ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">资源已录入。</p> : null}
    {params.notice === "batch-priority" ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">批量优先级处理完成：成功 {successCount} 条，未处理 {failedCount} 条。</p> : null}
    {params.notice === "batch-converted" ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">批量转换完成：成功 {successCount} 条，失败 {failedCount} 条。</p> : null}
    {params.notice === "batch-deleted" ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">批量删除完成：成功 {successCount} 条，未删除 {failedCount} 条。</p> : null}
    <form action={createTalentResource} autoComplete="off" className="mt-6 grid gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="text-sm font-semibold text-[#35443e]">快速录入资源</h2><p className="mt-1 text-xs text-slate-400">主页链接是首要识别信息；有链接时将优先用它检测重复。</p></div>
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="nickname" placeholder="达人昵称 *" required />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="primary_platform">{TALENT_PLATFORMS.map(v => <option key={v} value={v}>{TALENT_PLATFORM_LABELS[v]}</option>)}</select>
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="platform_account" placeholder="平台账号" />
      <input autoComplete="off" className="rounded-lg border border-[#afc2b9] bg-[#fbfdfc] px-3 py-2.5 text-sm md:col-span-2" name="profile_url" placeholder="达人主页链接（用于唯一识别）" type="url" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="wechat" placeholder="微信号" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" min="0" name="follower_count" placeholder="粉丝数量" type="number" />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="category" required><option value="">选择赛道 *</option>{TALENT_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="priority">{TALENT_PRIORITIES.map(v => <option key={v} value={v}>{TALENT_PRIORITY_LABELS[v]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue="platform_search" name="source_type">{RESOURCE_SOURCE_TYPES.map((value) => <option key={value} value={value}>{RESOURCE_SOURCE_TYPE_LABELS[value]}</option>)}</select>
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="source_detail" placeholder="来源详情，如搜索词/榜单名" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm md:col-span-2" name="source_url" placeholder="发现该达人的页面链接" type="url" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm md:col-span-3" name="notes" placeholder="备注" />
      <FormSubmitButton className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]" label="快速录入" pendingLabel="正在录入…" />
    </form>
    <form className="mt-5 grid gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-4 shadow-sm md:grid-cols-6">
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={search} name="q" placeholder="搜索昵称" />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={category} name="category"><option value="">全部赛道</option>{TALENT_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={priority} name="priority"><option value="">全部优先级</option>{TALENT_PRIORITIES.map(v => <option key={v} value={v}>{TALENT_PRIORITY_LABELS[v]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={resourceFilter} name="filter"><option value="">全部处理情况</option>{RESOURCE_FILTERS.map((value) => <option key={value} value={value}>{RESOURCE_FILTER_LABELS[value]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={status} name="status"><option value="new">待转达人</option><option value="converted">已转换</option></select>
      <button className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b]" type="submit">筛选</button>
    </form>
    {error ? <p className="mt-5 text-sm text-red-700">资源加载失败，请稍后重试。</p> : null}
    {!error && resources?.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[#d9e1dc] bg-white px-6 py-14 text-center text-sm text-slate-400">当前条件下暂无资源</p> : null}
    {!error && resources && resources.length > 0 ? <ResourceTable resources={resources} status={status} /> : null}
  </section></main>;
}
