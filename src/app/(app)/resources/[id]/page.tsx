import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getTalentPlatformLabel, getTalentPriorityLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

import { convertTalentResource } from "../actions";

type Props = { params: Promise<{ id: string }> };

export default async function ResourceDetailPage({ params }: Props) {
  const { id } = await params;
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

  const details = [
    ["平台", getTalentPlatformLabel(resource.primary_platform)],
    ["平台账号", resource.platform_account || "未填写"],
    ["赛道", resource.category],
    ["优先级", getTalentPriorityLabel(resource.priority)],
    ["微信号", resource.wechat || "未填写"],
    ["粉丝数量", resource.follower_count?.toLocaleString("zh-CN") ?? "未填写"],
    ["发现来源", resource.source || "未填写"],
    ["发现时间", formatDateTime(resource.discovered_at)],
  ];

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-4xl">
    <Link className="text-sm font-medium text-[#557064] hover:underline" href="/resources">← 返回资源池</Link>
    <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">RESOURCE PROFILE</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">{resource.nickname}</h1><p className="mt-2 text-sm text-slate-500">{resource.status === "new" ? "等待评估并转入跟进" : "已转换为正式达人"}</p></div>{resource.status === "new" ? <form action={convertTalentResource}><input name="resource_id" type="hidden" value={resource.id} /><button className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]" type="submit">转为正式达人</button></form> : resource.converted_talent_id ? <Link className="rounded-lg border border-[#d6dfda] px-4 py-2.5 text-sm font-medium text-[#31594b]" href={`/talents/${resource.converted_talent_id}`}>查看正式达人</Link> : null}</div>
      <dl className="mt-7 grid gap-4 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-4">{details.map(([label, value]) => <div className="rounded-xl bg-[#f8faf8] p-4" key={label}><dt className="text-xs text-slate-400">{label}</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{value}</dd></div>)}</dl>
      {resource.profile_url ? <a className="mt-6 inline-flex text-sm font-medium text-[#31594b] hover:underline" href={resource.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a> : null}
      <div className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">资源备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{resource.notes || "暂无备注"}</p></div>
    </div>
  </section></main>;
}
