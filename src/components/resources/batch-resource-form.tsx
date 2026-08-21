"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import { batchCreateTalentResources, type BatchCreateResourcesState } from "@/app/(app)/resources/actions";
import { getTalentPlatformLabel, getTalentPriorityLabel } from "@/lib/constants";
import { parseBatchResources } from "@/lib/resources/batch-parser";

const initialState: BatchCreateResourcesState = {};

function ImportButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <button className="rounded-lg bg-[#31594b] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]" disabled={disabled || pending} type="submit">{pending ? "正在导入…" : "确认导入"}</button>;
}

export function BatchResourceForm() {
  const [text, setText] = useState("");
  const [previewedText, setPreviewedText] = useState("");
  const [state, formAction] = useActionState(batchCreateTalentResources, initialState);
  const rows = useMemo(() => parseBatchResources(previewedText), [previewedText]);
  const validRows = rows.filter((row) => row.errors.length === 0);
  const hasTooManyRows = rows.length > 100;

  return <div className="mt-6 grid gap-6">
    {state.error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</p> : null}
    {state.imported !== undefined ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><p>导入完成：新增 {state.imported} 条，跳过重复 {state.skipped ?? 0} 条。</p>{state.duplicates?.length ? <div className="mt-2 border-t border-emerald-200 pt-2"><p className="font-medium">重复明细：</p><ul className="mt-1 list-inside list-disc space-y-1">{state.duplicates.map((duplicate) => <li key={duplicate}>{duplicate}</li>)}</ul>{(state.skipped ?? 0) > state.duplicates.length ? <p className="mt-1 text-xs">仅展示前 {state.duplicates.length} 条重复信息。</p> : null}</div> : null}</div> : null}
    <section className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-[#26332e]">粘贴资源数据</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">每行一个达人，字段统一使用分号“;”或中文分号“；”分隔。</p>
      <p className="mt-1 text-xs text-slate-400">顺序：昵称；平台；平台账号；微信账号；主页链接；粉丝数；赛道；优先级；发现来源；备注。赛道默认“其他”，优先级默认“普通”；粉丝数支持 `569.1w`。</p>
      <textarea className="mt-4 min-h-52 w-full resize-y rounded-xl border border-[#dfe5e1] px-4 py-3 text-sm leading-6" onChange={(event) => setText(event.target.value)} placeholder={"例如：\n大金小金-mini金；抖音；jinjinkk；SUNNYXXSCO；https://www.douyin.com/user/example；569.1w；美妆；高价值"} value={text} />
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">单次最多 100 条，导入前会在服务端再次校验和查重。</span>
        <button className="rounded-lg border border-[#31594b] px-4 py-2 text-sm font-medium text-[#31594b] disabled:opacity-40" disabled={!text.trim()} onClick={() => setPreviewedText(text)} type="button">解析并预览</button>
      </div>
    </section>

    {rows.length ? <section className="overflow-hidden rounded-2xl border border-[#e7ebe8] bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#edf0ee] px-5 py-4">
        <div><h2 className="font-semibold text-[#26332e]">导入预览</h2><p className="mt-1 text-xs text-slate-400">共 {rows.length} 条，可导入 {validRows.length} 条，需修正 {rows.length - validRows.length} 条。</p></div>
        <form action={formAction}>
          <input name="resources" type="hidden" value={JSON.stringify(validRows.map((row) => row.resource))} />
          <ImportButton disabled={validRows.length === 0 || rows.some((row) => row.errors.length > 0) || hasTooManyRows} />
        </form>
      </div>
      <div className="overflow-x-auto"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-[#f8faf8] text-xs text-[#668074]"><tr><th className="px-4 py-3">行</th><th className="px-4 py-3">昵称</th><th className="px-4 py-3">平台</th><th className="px-4 py-3">平台账号</th><th className="px-4 py-3">微信账号</th><th className="px-4 py-3">主页链接</th><th className="px-4 py-3">粉丝数</th><th className="px-4 py-3">赛道</th><th className="px-4 py-3">优先级</th><th className="px-4 py-3">校验</th></tr></thead><tbody>{rows.map((row) => <tr className="border-t border-[#edf0ee]" key={row.rowNumber}><td className="px-4 py-3 text-slate-400">{row.rowNumber}</td><td className="px-4 py-3 font-medium text-[#26332e]">{row.resource.nickname || "—"}</td><td className="px-4 py-3">{row.resource.primary_platform ? getTalentPlatformLabel(row.resource.primary_platform) : "—"}</td><td className="px-4 py-3 text-slate-500">{row.resource.platform_account || "—"}</td><td className="px-4 py-3 text-slate-500">{row.resource.wechat || "—"}</td><td className="max-w-48 px-4 py-3"><span className="block truncate text-slate-500" title={row.resource.profile_url ?? undefined}>{row.resource.profile_url || "—"}</span></td><td className="px-4 py-3">{row.resource.follower_count?.toLocaleString("zh-CN") ?? "—"}</td><td className="px-4 py-3">{row.resource.category || "—"}</td><td className="px-4 py-3">{row.resource.priority ? getTalentPriorityLabel(row.resource.priority) : "—"}</td><td className={`px-4 py-3 ${row.errors.length ? "text-red-600" : "text-emerald-700"}`}>{row.errors.length ? row.errors.join("、") : "可导入"}</td></tr>)}</tbody></table></div>
      {hasTooManyRows ? <p className="border-t border-red-100 bg-red-50 px-5 py-3 text-sm text-red-700">超过单次 100 条限制，请分批导入。</p> : null}
    </section> : null}
  </div>;
}
