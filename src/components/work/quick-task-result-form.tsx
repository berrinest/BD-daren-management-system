"use client";

import { useFormStatus } from "react-dom";

import { completeWorkTaskWithResult } from "@/app/(app)/work/actions";
import {
  FOLLOW_UP_METHODS,
  getFollowUpMethodLabel,
  getFollowUpResultLabel,
} from "@/lib/constants";
import { QUICK_WORK_RESULTS } from "@/lib/validations";

function QuickResultButton({ result }: { result: (typeof QUICK_WORK_RESULTS)[number] }) {
  const { pending } = useFormStatus();

  return <button className="rounded-lg border border-[#cbd8d2] bg-white px-3 py-2 text-sm font-medium text-[#31594b] hover:border-[#31594b] hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} name="result" type="submit" value={result}>{pending ? "保存中…" : getFollowUpResultLabel(result)}</button>;
}

type Props = {
  talentId: string;
  taskId: string;
};

export function QuickTaskResultForm({ talentId, taskId }: Props) {
  return <form action={completeWorkTaskWithResult} className="mt-4 rounded-xl border border-[#e0e7e3] bg-[#f8faf8] p-4">
    <input name="task_id" type="hidden" value={taskId} />
    <input name="talent_id" type="hidden" value={talentId} />
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="text-sm font-semibold text-[#26332e]">快速完成并记录结果</h3><p className="mt-1 text-xs text-slate-500">点击结果即保存真实跟进记录、完成当前任务并进入下一项。</p></div><span className="text-xs text-slate-400">默认：微信 · 当前时间</span></div>
    <div className="mt-4 flex flex-wrap gap-2">{QUICK_WORK_RESULTS.map((result) => <QuickResultButton key={result} result={result} />)}</div>
    <details className="mt-4 border-t border-[#e1e7e3] pt-3"><summary className="cursor-pointer text-xs font-medium text-[#557064]">补充联系方式或备注（可选）</summary><div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]"><label className="grid gap-1.5 text-xs font-medium text-slate-600">联系方式<select className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm" defaultValue="wechat" name="method">{FOLLOW_UP_METHODS.map((method) => <option key={method} value={method}>{getFollowUpMethodLabel(method)}</option>)}</select></label><label className="grid gap-1.5 text-xs font-medium text-slate-600">备注<input className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm" maxLength={2000} name="notes" placeholder="可选：记录关键沟通信息" /></label></div></details>
  </form>;
}
