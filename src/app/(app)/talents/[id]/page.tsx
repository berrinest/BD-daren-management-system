import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getTalentPlatformLabel, getTalentPriorityLabel, getTalentStageLabel } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type TalentDetailPageProps = { params: Promise<{ id: string }> };

export default async function TalentDetailPage({ params }: TalentDetailPageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const { data: talent, error } = await supabase.from("talents").select("*").eq("id", id).eq("user_id", userId).is("archived_at", null).maybeSingle();
  if (error || !talent) notFound();

  const details = [
    ["主要平台", getTalentPlatformLabel(talent.primary_platform)],
    ["平台账号", talent.platform_account || "未填写"],
    ["微信号", talent.wechat || "未填写"],
    ["粉丝数量", talent.follower_count?.toLocaleString("zh-CN") ?? "未填写"],
    ["优先级", getTalentPriorityLabel(talent.priority)],
    ["当前阶段", getTalentStageLabel(talent.stage)],
  ];

  return (
    <main className="p-5 md:p-8"><section className="mx-auto max-w-5xl">
      <Link className="text-sm font-medium text-[#557064] hover:underline" href="/talents">← 返回达人库</Link>
      <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TALENT PROFILE</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">{talent.nickname}</h1>
        <div className="mt-4 flex flex-wrap gap-2">{talent.tags.length > 0 ? talent.tags.map((tag) => <span className="rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs text-[#48685b]" key={tag}>{tag}</span>) : <span className="text-sm text-slate-400">暂无标签</span>}</div>
        <dl className="mt-7 grid gap-4 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div className="rounded-xl bg-[#f8faf8] p-4" key={label}><dt className="text-xs font-medium text-slate-400">{label}</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{value}</dd></div>)}</dl>
        {talent.profile_url ? <p className="mt-6 text-sm"><a className="font-medium text-[#31594b] hover:underline" href={talent.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a></p> : null}
        <div className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">联系备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{talent.notes || "暂无备注"}</p></div>
      </div>
    </section></main>
  );
}
