import { createTalentResource } from "@/app/(app)/resources/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  RESOURCE_SOURCE_TYPES,
  RESOURCE_SOURCE_TYPE_LABELS,
  TALENT_CATEGORIES,
  TALENT_PLATFORMS,
  TALENT_PLATFORM_LABELS,
  TALENT_PRIORITIES,
  TALENT_PRIORITY_LABELS,
} from "@/lib/constants";

export function QuickResourceForm() {
  return <form action={createTalentResource} autoComplete="off" className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="text-sm font-semibold text-[#35443e]">快速录入资源</h2><p className="mt-1 text-xs text-slate-400">先记录推进工作必需的信息，其他资料可以稍后补充。</p></div><span className="text-xs text-slate-400">* 为必填项</span></div>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="nickname" placeholder="达人昵称 *" required />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="primary_platform">{TALENT_PLATFORMS.map((value) => <option key={value} value={value}>{TALENT_PLATFORM_LABELS[value]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="category" required><option value="">选择赛道 *</option>{TALENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue="normal" name="priority">{TALENT_PRIORITIES.map((value) => <option key={value} value={value}>{TALENT_PRIORITY_LABELS[value]}</option>)}</select>
      <input autoComplete="off" className="rounded-lg border border-[#afc2b9] bg-[#fbfdfc] px-3 py-2.5 text-sm md:col-span-2" name="profile_url" placeholder="达人主页链接（优先用于查重）" type="url" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="wechat" placeholder="微信号" />
      <FormSubmitButton className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]" label="快速录入" pendingLabel="正在录入…" />
    </div>
    <details className="mt-4 border-t border-[#edf0ee] pt-4"><summary className="cursor-pointer text-sm font-medium text-[#557064]">补充账号、粉丝、来源和备注（可选）</summary><div className="mt-4 grid gap-3 md:grid-cols-4">
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="platform_account" placeholder="平台账号" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" min="0" name="follower_count" placeholder="粉丝数量" type="number" />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue="platform_search" name="source_type">{RESOURCE_SOURCE_TYPES.map((value) => <option key={value} value={value}>{RESOURCE_SOURCE_TYPE_LABELS[value]}</option>)}</select>
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="source_detail" placeholder="来源详情，如搜索词" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm md:col-span-2" name="source_url" placeholder="发现页面链接" type="url" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm md:col-span-2" name="notes" placeholder="备注" />
    </div></details>
  </form>;
}
