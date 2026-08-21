"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { createTalentResource } from "@/app/(app)/resources/actions";
import {
  RESOURCE_SOURCE_TYPES,
  RESOURCE_SOURCE_TYPE_LABELS,
  TALENT_CATEGORIES,
  TALENT_PLATFORMS,
  TALENT_PLATFORM_LABELS,
  TALENT_PRIORITIES,
  TALENT_PRIORITY_LABELS,
} from "@/lib/constants";

type Platform = (typeof TALENT_PLATFORMS)[number];

function detectPlatform(profileUrl: string): Platform | null {
  const value = profileUrl.toLowerCase();
  if (value.includes("douyin.com")) return "douyin";
  if (value.includes("xiaohongshu.com") || value.includes("xhslink.com")) return "xiaohongshu";
  if (value.includes("bilibili.com") || value.includes("b23.tv")) return "bilibili";
  if (value.includes("kuaishou.com")) return "kuaishou";
  if (value.includes("weibo.com")) return "weibo";
  return null;
}

function SaveButton({ intent, label }: { intent: "continue" | "save"; label: string }) {
  const { pending } = useFormStatus();
  const className = intent === "continue"
    ? "rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]"
    : "rounded-lg border border-[#31594b] px-4 py-2.5 text-sm font-semibold text-[#31594b] disabled:cursor-not-allowed disabled:opacity-50";
  return <button className={className} disabled={pending} name="submit_intent" type="submit" value={intent}>{pending ? "正在录入…" : label}</button>;
}

type Props = {
  defaultCategory?: string;
  defaultPlatform?: string;
  defaultPriority?: string;
};

export function QuickResourceForm({ defaultCategory = "", defaultPlatform = "douyin", defaultPriority = "normal" }: Props) {
  const initialPlatform = TALENT_PLATFORMS.find((value) => value === defaultPlatform) ?? "douyin";
  const initialPriority = TALENT_PRIORITIES.find((value) => value === defaultPriority) ?? "normal";
  const initialCategory = TALENT_CATEGORIES.find((value) => value === defaultCategory) ?? "";
  const [platform, setPlatform] = useState<Platform>(initialPlatform);

  return <form action={createTalentResource} autoComplete="off" className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><h2 className="text-sm font-semibold text-[#35443e]">快速录入资源</h2><p className="mt-1 text-xs text-slate-400">粘贴主页链接会自动识别平台；保存并继续时保留平台、赛道和优先级。</p></div><span className="text-xs text-slate-400">* 为必填项</span></div>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="nickname" placeholder="达人昵称 *" required />
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="primary_platform" onChange={(event) => setPlatform(event.target.value as Platform)} value={platform}>{TALENT_PLATFORMS.map((value) => <option key={value} value={value}>{TALENT_PLATFORM_LABELS[value]}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue={initialCategory} name="category" required><option value="">选择赛道 *</option>{TALENT_CATEGORIES.map((value) => <option key={value}>{value}</option>)}</select>
      <select className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" defaultValue={initialPriority} name="priority">{TALENT_PRIORITIES.map((value) => <option key={value} value={value}>{TALENT_PRIORITY_LABELS[value]}</option>)}</select>
      <input autoComplete="off" className="rounded-lg border border-[#afc2b9] bg-[#fbfdfc] px-3 py-2.5 text-sm md:col-span-2" name="profile_url" onChange={(event) => { const detected = detectPlatform(event.target.value); if (detected) setPlatform(detected); }} placeholder="达人主页链接（自动识别平台并用于查重）" type="url" />
      <input autoComplete="off" className="rounded-lg border border-[#dfe5e1] px-3 py-2.5 text-sm" name="wechat" placeholder="微信号" />
      <div className="flex flex-wrap gap-2"><SaveButton intent="continue" label="保存并继续" /><SaveButton intent="save" label="保存" /></div>
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
