import Link from "next/link";

import {
  TALENT_PLATFORMS, TALENT_PLATFORM_LABELS, TALENT_PRIORITIES,
  TALENT_PRIORITY_LABELS, TALENT_STAGES, TALENT_STAGE_LABELS,
} from "@/lib/constants";
import { createTalent } from "../actions";

type NewTalentPageProps = { searchParams: Promise<{ error?: string }> };
const inputClassName = "rounded-lg border border-[#dfe5e1] px-3 py-2.5 outline-none focus:border-[#31594b]";

export default async function NewTalentPage({ searchParams }: NewTalentPageProps) {
  const { error } = await searchParams;
  return (
    <main className="p-5 md:p-8"><section className="mx-auto max-w-4xl">
      <Link className="text-sm font-medium text-[#557064] hover:underline" href="/talents">← 返回达人库</Link>
      <p className="mt-6 text-xs font-semibold tracking-[0.18em] text-[#668074]">NEW TALENT</p>
      <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">添加达人</h1>
      <p className="mt-2 text-sm text-slate-500">先记录必要资料，后续可以在达人详情中继续完善跟进。</p>
      {error ? <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p> : null}
      <form action={createTalent} className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">达人昵称 *<input className={inputClassName} maxLength={100} name="nickname" required /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">主要平台 *<select className={inputClassName} defaultValue="douyin" name="primary_platform">{TALENT_PLATFORMS.map((value) => <option key={value} value={value}>{TALENT_PLATFORM_LABELS[value]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">平台账号<input className={inputClassName} maxLength={200} name="platform_account" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">微信号<input className={inputClassName} maxLength={100} name="wechat" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">主页链接<input className={inputClassName} name="profile_url" placeholder="https://" type="url" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">粉丝数量<input className={inputClassName} min="0" name="follower_count" step="1" type="number" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">优先级<select className={inputClassName} defaultValue="normal" name="priority">{TALENT_PRIORITIES.map((value) => <option key={value} value={value}>{TALENT_PRIORITY_LABELS[value]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e]">当前阶段<select className={inputClassName} defaultValue="not_contacted" name="stage">{TALENT_STAGES.map((value) => <option key={value} value={value}>{TALENT_STAGE_LABELS[value]}</option>)}</select></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">标签<input className={inputClassName} name="tags" placeholder="美妆，直播，高转化（使用逗号分隔）" /></label>
          <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">联系备注<textarea className={`${inputClassName} min-h-28 resize-y`} maxLength={2000} name="notes" /></label>
        </div>
        <div className="mt-7 flex justify-end gap-3 border-t border-[#edf0ee] pt-6">
          <Link className="rounded-lg border border-[#dfe5e1] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-[#f4f6f4]" href="/talents">取消</Link>
          <button className="rounded-lg bg-[#31594b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]" type="submit">保存达人</button>
        </div>
      </form>
    </section></main>
  );
}
