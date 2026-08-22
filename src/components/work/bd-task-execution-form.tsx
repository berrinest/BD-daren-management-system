"use client";

import { useFormStatus } from "react-dom";

import { executeBdTask } from "@/app/(app)/tasks/actions";
import {
  getFollowUpResultLabel,
  getResourceContactResultLabel,
} from "@/lib/constants";

const TALENT_RESULTS = [
  "replied",
  "no_response",
  "interested",
  "quote_sent",
  "cooperation",
  "rejected",
] as const;

const RESOURCE_RESULTS = [
  "friend_request",
  "reapplication",
  "accepted",
  "replied",
  "no_response",
  "rejected",
] as const;

type TargetType = "resource" | "talent";
type ExecutionResult = (typeof TALENT_RESULTS)[number] | (typeof RESOURCE_RESULTS)[number];

function ResultButton({ result, targetType }: { result: ExecutionResult; targetType: TargetType }) {
  const { pending } = useFormStatus();
  const label = targetType === "talent"
    ? getFollowUpResultLabel(result)
    : getResourceContactResultLabel(result);

  return <button className="rounded-lg border border-[#cbd8d2] bg-white px-3 py-2 text-sm font-medium text-[#31594b] hover:border-[#31594b] hover:bg-[#f4f8f6] disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} name="result" type="submit" value={result}>{pending ? "保存中…" : label}</button>;
}

type Props = {
  targetType: TargetType;
  taskId: string;
};

export function BdTaskExecutionForm({ targetType, taskId }: Props) {
  const results: readonly ExecutionResult[] = targetType === "talent" ? TALENT_RESULTS : RESOURCE_RESULTS;

  return <form action={executeBdTask} className="mt-4 rounded-xl border border-[#e0e7e3] bg-[#f8faf8] p-4">
    <input name="task_id" type="hidden" value={taskId} />
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="text-sm font-semibold text-[#26332e]">执行任务并记录结果</h3><p className="mt-1 text-xs text-slate-500">点击结果后记录真实联系历史、完成当前任务并进入下一项。</p></div><span className="text-xs text-slate-400">默认：微信 · 当前时间</span></div>
    <details className="mt-4 border-t border-[#e1e7e3] pt-3"><summary className="cursor-pointer text-xs font-medium text-[#557064]">补充备注和下一步信息（可选）</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="grid gap-1.5 text-xs font-medium text-slate-600">执行备注<input className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm" maxLength={2000} name="notes" placeholder="记录本次执行要点" /></label><label className="grid gap-1.5 text-xs font-medium text-slate-600">下一步动作<input className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm" maxLength={500} name="next_action" placeholder="例如：再次联系或发送合作方案" /></label><label className="grid gap-1.5 text-xs font-medium text-slate-600 sm:col-span-2">下一步时间<input className="rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm" name="next_action_at" type="datetime-local" /></label></div><p className="mt-3 text-xs text-slate-400">本阶段只保存下一步信息，不会自动创建下一任务。</p></details>
    <div className="mt-4 flex flex-wrap gap-2">{results.map((result) => <ResultButton key={result} result={result} targetType={targetType} />)}</div>
  </form>;
}
