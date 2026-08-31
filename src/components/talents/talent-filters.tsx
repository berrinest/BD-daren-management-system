"use client";

import Link from "next/link";

import {
  TALENT_CATEGORIES,
  TALENT_PRIORITIES,
  TALENT_PRIORITY_LABELS,
} from "@/lib/constants";

type TalentFiltersProps = {
  category: string;
  priority: string;
  search: string;
};

export function TalentFilters({ category, priority, search }: TalentFiltersProps) {
  return (
    <form className="mt-6 grid gap-3 rounded-2xl border border-[#e7ebe8] bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
      <label className="sr-only" htmlFor="talent-search">搜索达人昵称</label>
      <input className="min-w-0 rounded-lg border border-[#dfe5e1] px-3 py-2 text-sm outline-none focus:border-[#31594b]" defaultValue={search} id="talent-search" name="q" placeholder="搜索达人昵称" type="search" />
      <label className="sr-only" htmlFor="talent-category">按赛道筛选</label>
      <select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-sm text-[#35443e]" defaultValue={category} id="talent-category" name="category" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <option value="">全部赛道</option>
        {TALENT_CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}
      </select>
      <label className="sr-only" htmlFor="talent-priority">按任务优先级筛选</label>
      <select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2 text-sm text-[#35443e]" defaultValue={priority} id="talent-priority" name="priority" onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        <option value="">全部任务优先级</option>
        {TALENT_PRIORITIES.map((value) => <option key={value} value={value}>{TALENT_PRIORITY_LABELS[value]}</option>)}
      </select>
      <div className="flex gap-2">
        <button className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b] hover:bg-[#f4f6f4]" type="submit">筛选</button>
        {search || category || priority ? <Link className="inline-flex items-center px-2 text-sm text-slate-500 hover:text-[#31594b]" href="/talents">清除</Link> : null}
      </div>
    </form>
  );
}
