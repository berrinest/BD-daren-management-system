"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import { createResourceContactRecord } from "@/app/(app)/resources/actions";
import { RESOURCE_CONTACT_METHOD_LABELS, RESOURCE_CONTACT_METHODS, RESOURCE_CONTACT_RESULT_LABELS, RESOURCE_CONTACT_RESULTS } from "@/lib/constants";
import { getShanghaiSecondDayAtTen, toShanghaiDateTimeLocalValue } from "@/lib/formatters/date";

type Props = { continueProcessing?: boolean; nextResourceId?: string; processingDone?: boolean; processingScope?: "today"; resourceId: string };

const STATUS_HINTS: Partial<Record<(typeof RESOURCE_CONTACT_RESULTS)[number], string>> = {
  friend_request: "自动更新为“等待通过”，后天上午 10 点再次处理",
  reapplication: "自动更新为“等待通过”，后天上午 10 点再次处理",
  accepted: "保存后将自动移入达人库，阶段设为“已通过”并创建首个跟进任务",
  replied: "保存后将自动移入达人库，阶段设为“已回复”并创建首个跟进任务",
  no_response: "自动更新为“已尝试添加”，后天上午 10 点再次处理",
};

const VISIBLE_RESULTS = ["friend_request", "reapplication", "accepted", "replied", "no_response"] as const;

function getSuggestedNextAction() {
  return toShanghaiDateTimeLocalValue(getShanghaiSecondDayAtTen());
}

function SubmitButton({ continueProcessing }: { continueProcessing: boolean }) {
  const { pending } = useFormStatus();
  return <button className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#91a59e]" disabled={pending} type="submit">{pending ? "正在保存…" : continueProcessing ? "保存并处理下一条" : "保存联系记录"}</button>;
}

export function ResourceContactForm({ continueProcessing = false, nextResourceId, processingDone = false, processingScope, resourceId }: Props) {
  const [result, setResult] = useState<(typeof RESOURCE_CONTACT_RESULTS)[number]>("friend_request");
  const [nextActionAt, setNextActionAt] = useState(getSuggestedNextAction());

  function chooseResult(value: (typeof RESOURCE_CONTACT_RESULTS)[number]) {
    setResult(value);
    setNextActionAt(getSuggestedNextAction());
  }

  return <form action={createResourceContactRecord} className="mt-4 grid gap-4 rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4 md:grid-cols-2">
    <input name="resource_id" type="hidden" value={resourceId} />
    {continueProcessing ? <input name="continue_processing" type="hidden" value="1" /> : null}
    {processingScope ? <input name="processing_scope" type="hidden" value={processingScope} /> : null}
    {nextResourceId ? <input name="next_resource_id" type="hidden" value={nextResourceId} /> : null}
    {processingDone ? <input name="processing_done" type="hidden" value="1" /> : null}
    <label className="grid gap-2 text-sm font-medium text-[#35443e]">联系时间<input className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue={toShanghaiDateTimeLocalValue()} name="occurred_at" required type="datetime-local" /></label>
    <label className="grid gap-2 text-sm font-medium text-[#35443e]">联系方式<select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue="wechat" name="method">{RESOURCE_CONTACT_METHODS.map((value) => <option key={value} value={value}>{RESOURCE_CONTACT_METHOD_LABELS[value]}</option>)}</select></label>
    <fieldset className="md:col-span-2"><legend className="text-sm font-medium text-[#35443e]">联系结果</legend><div className="mt-2 flex flex-wrap gap-2">{VISIBLE_RESULTS.map((value) => <label className={`cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition ${result === value ? "border-[#31594b] bg-[#31594b] text-white" : "border-[#d6dfda] bg-white text-[#31594b] hover:bg-[#f4f6f4]"}`} key={value}><input checked={result === value} className="sr-only" name="result" onChange={() => chooseResult(value)} type="radio" value={value} />{RESOURCE_CONTACT_RESULT_LABELS[value]}</label>)}</div>{STATUS_HINTS[result] ? <p className="mt-2 text-xs font-medium text-[#668074]">{STATUS_HINTS[result]}</p> : null}</fieldset>
    <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">下一次处理时间<span className="text-xs font-normal text-slate-400">已按联系结果自动建议，可修改或清空。</span><input className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" name="next_action_at" onChange={(event) => setNextActionAt(event.target.value)} type="datetime-local" value={nextActionAt} /></label>
    <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">备注<textarea className="min-h-24 resize-y rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" maxLength={2000} name="notes" placeholder="记录申请、回复或后续联系要点" /></label>
    <div className="text-right md:col-span-2"><SubmitButton continueProcessing={continueProcessing} /></div>
  </form>;
}
