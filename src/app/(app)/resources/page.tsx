import { redirect } from "next/navigation";

import { TALENT_CATEGORIES, TALENT_PLATFORMS, TALENT_PLATFORM_LABELS, TALENT_PRIORITIES, TALENT_PRIORITY_LABELS, getTalentPlatformLabel, getTalentPriorityLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

import { convertTalentResource, createTalentResource } from "./actions";

type Props = { searchParams: Promise<{ category?: string; error?: string; notice?: string; priority?: string; q?: string; status?: string }> };

export default async function ResourcesPage({ searchParams }: Props) {
  const params = await searchParams;
  const category = TALENT_CATEGORIES.find((value) => value === params.category) ?? "";
  const priority = TALENT_PRIORITIES.find((value) => value === params.priority) ?? "";
  const status = params.status === "converted" ? "converted" : "new";
  const search = (params.q ?? "").trim().slice(0, 100);
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login");

  let query = supabase.from("talent_resources").select("*").eq("user_id", userId).eq("status", status).order("priority").order("discovered_at", { ascending: false });
  if (search) query = query.ilike("nickname", `%${search.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`);
  if (category) query = query.eq("category", category);
  if (priority) query = query.eq("priority", priority);
  const { data: resources, error } = await query;

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-6xl">
    <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">DISCOVERY</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">达人资源池</h1><p className="mt-2 text-sm text-slate-500">快速收集新发现的达人，筛选后转换到正式跟进流程。</p>
    {params.error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{params.error}</p> : null}{params.notice === "created" ? <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">资源已录入。</p> : null}
    <form action={createTalentResource} className="mt-6 grid gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm md:grid-cols-4">
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="nickname" placeholder="达人昵称 *" required />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="primary_platform">{TALENT_PLATFORMS.map(v => <option key={v} value={v}>{TALENT_PLATFORM_LABELS[v]}</option>)}</select>
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="platform_account" placeholder="平台账号" />
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="profile_url" placeholder="主页链接" type="url" />
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="wechat" placeholder="微信号" />
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" min="0" name="follower_count" placeholder="粉丝数量" type="number" />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="category" required><option value="">选择赛道 *</option>{TALENT_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="priority">{TALENT_PRIORITIES.map(v => <option key={v} value={v}>{TALENT_PRIORITY_LABELS[v]}</option>)}</select>
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="source" placeholder="发现来源" />
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="notes" placeholder="备注" />
      <button className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white md:col-start-4" type="submit">快速录入</button>
    </form>
    <form className="mt-5 grid gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-4 shadow-sm md:grid-cols-5">
      <input className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={search} name="q" placeholder="搜索昵称" />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={category} name="category"><option value="">全部赛道</option>{TALENT_CATEGORIES.map(v => <option key={v}>{v}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={priority} name="priority"><option value="">全部优先级</option>{TALENT_PRIORITIES.map(v => <option key={v} value={v}>{TALENT_PRIORITY_LABELS[v]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm" defaultValue={status} name="status"><option value="new">待转达人</option><option value="converted">已转换</option></select>
      <button className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b]" type="submit">筛选</button>
    </form>
    {error ? <p className="mt-5 text-sm text-red-700">资源加载失败，请稍后重试。</p> : null}
    {!error && resources?.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-[#d9e1dc] bg-white px-6 py-14 text-center text-sm text-slate-400">当前条件下暂无资源</p> : null}
    {!error && resources && resources.length > 0 ? <div className="mt-5 overflow-x-auto rounded-2xl border border-[#e7ebe8] bg-white shadow-sm"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#f8faf8] text-xs text-[#668074]"><tr><th className="px-5 py-3">达人</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">赛道</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">来源</th><th className="px-5 py-3 text-right">操作</th></tr></thead><tbody className="divide-y divide-[#edf0ee]">{resources.map(item => <tr key={item.id}><td className="px-5 py-4"><strong>{item.nickname}</strong><span className="mt-1 block text-xs text-slate-400">{item.platform_account || "未填写账号"}</span></td><td className="px-4 py-4">{getTalentPlatformLabel(item.primary_platform)}</td><td className="px-4 py-4">{item.category}</td><td className="px-4 py-4">{getTalentPriorityLabel(item.priority)}</td><td className="px-4 py-4">{item.source || "—"}</td><td className="px-5 py-4 text-right">{item.status === "new" ? <form action={convertTalentResource}><input name="resource_id" type="hidden" value={item.id} /><button className="rounded-lg bg-[#31594b] px-3 py-2 text-xs font-semibold text-white" type="submit">转为正式达人</button></form> : <span className="text-xs text-emerald-700">已转换</span>}</td></tr>)}</tbody></table></div> : null}
  </section></main>;
}
