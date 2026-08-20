import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getTalentPlatformLabel,
  getTalentPriorityLabel,
  getTalentStageLabel,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

type TalentsPageProps = {
  searchParams: Promise<{ notice?: string; q?: string }>;
};

export default async function TalentsPage({ searchParams }: TalentsPageProps) {
  const { notice, q = "" } = await searchParams;
  const search = q.trim().slice(0, 100);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;

  if (!userId) redirect("/login");

  let query = supabase
    .from("talents")
    .select("id, nickname, primary_platform, platform_account, wechat, tags, priority, stage, created_at")
    .eq("user_id", userId)
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (search) {
    const escapedSearch = search.replaceAll("%", "\\%").replaceAll("_", "\\_");
    query = query.ilike("nickname", `%${escapedSearch}%`);
  }

  const { data: talents, error } = await query;

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TALENTS</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">达人库</h1>
            <p className="mt-2 text-sm text-slate-500">管理达人资料、优先级和当前合作阶段。</p>
          </div>
          <Link className="inline-flex items-center justify-center rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]" href="/talents/new">
            添加达人
          </Link>
        </div>

        <form className="mt-6 flex gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-4 shadow-sm">
          <label className="sr-only" htmlFor="talent-search">搜索达人昵称</label>
          <input className="min-w-0 flex-1 rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm outline-none focus:border-[#31594b]" defaultValue={search} id="talent-search" name="q" placeholder="搜索达人昵称" type="search" />
          <button className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b] hover:bg-[#f4f6f4]" type="submit">搜索</button>
          {search ? <Link className="inline-flex items-center px-2 text-sm text-slate-500 hover:text-[#31594b]" href="/talents">清除</Link> : null}
        </form>

        {notice === "archived" ? (
          <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
            达人已归档，并从默认列表隐藏。
          </p>
        ) : null}

        {error ? <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">达人数据加载失败，请稍后重试。</div> : null}

        {!error && talents?.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-dashed border-[#d9e1dc] bg-white px-6 py-14 text-center">
            <h2 className="text-base font-semibold text-[#35443e]">{search ? "没有找到匹配的达人" : "还没有达人记录"}</h2>
            <p className="mt-2 text-sm text-slate-500">{search ? "换一个昵称试试。" : "添加第一位达人，开始管理你的 BD 跟进。"}</p>
          </div>
        ) : null}

        {!error && talents && talents.length > 0 ? (
          <div className="mt-5 overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                <thead className="bg-[#f8faf8] text-xs font-semibold tracking-wide text-[#668074]">
                  <tr><th className="px-5 py-3">达人</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">微信</th><th className="px-4 py-3">标签</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">阶段</th><th className="px-5 py-3 text-right">操作</th></tr>
                </thead>
                <tbody className="divide-y divide-[#edf0ee]">
                  {talents.map((talent) => (
                    <tr className="hover:bg-[#fbfcfb]" key={talent.id}>
                      <td className="px-5 py-4"><strong className="block font-semibold text-[#2f3d37]">{talent.nickname}</strong><span className="mt-1 block text-xs text-slate-400">{talent.platform_account || "未填写平台账号"}</span></td>
                      <td className="px-4 py-4 text-slate-600">{getTalentPlatformLabel(talent.primary_platform)}</td>
                      <td className="px-4 py-4 text-slate-600">{talent.wechat || "—"}</td>
                      <td className="px-4 py-4"><div className="flex max-w-52 flex-wrap gap-1.5">{talent.tags.length > 0 ? talent.tags.slice(0, 3).map((tag) => <span className="rounded-full bg-[#eef4f1] px-2 py-1 text-xs text-[#48685b]" key={tag}>{tag}</span>) : "—"}</div></td>
                      <td className="px-4 py-4 text-slate-600">{getTalentPriorityLabel(talent.priority)}</td>
                      <td className="px-4 py-4 text-slate-600">{getTalentStageLabel(talent.stage)}</td>
                      <td className="px-5 py-4 text-right"><Link className="font-medium text-[#31594b] hover:underline" href={`/talents/${talent.id}`}>查看</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
