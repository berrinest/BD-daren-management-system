import { createResourceContactRecord } from "@/app/(app)/resources/actions";
import { RESOURCE_CONTACT_METHOD_LABELS, RESOURCE_CONTACT_METHODS, RESOURCE_CONTACT_RESULT_LABELS, RESOURCE_CONTACT_RESULTS } from "@/lib/constants";
import { toShanghaiDateTimeLocalValue } from "@/lib/formatters/date";

type Props = { continueProcessing?: boolean; resourceId: string };

export function ResourceContactForm({ continueProcessing = false, resourceId }: Props) {
  return <form action={createResourceContactRecord} className="mt-4 grid gap-4 rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4 md:grid-cols-2">
    <input name="resource_id" type="hidden" value={resourceId} />
    {continueProcessing ? <input name="continue_processing" type="hidden" value="1" /> : null}
    <label className="grid gap-2 text-sm font-medium text-[#35443e]">联系时间<input className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue={toShanghaiDateTimeLocalValue()} name="occurred_at" required type="datetime-local" /></label>
    <label className="grid gap-2 text-sm font-medium text-[#35443e]">联系方式<select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue="wechat" name="method">{RESOURCE_CONTACT_METHODS.map((value) => <option key={value} value={value}>{RESOURCE_CONTACT_METHOD_LABELS[value]}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">联系结果<select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue="friend_request" name="result">{RESOURCE_CONTACT_RESULTS.map((value) => <option key={value} value={value}>{RESOURCE_CONTACT_RESULT_LABELS[value]}</option>)}</select></label>
    <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">备注<textarea className="min-h-24 resize-y rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" maxLength={2000} name="notes" placeholder="记录申请、回复或后续联系要点" /></label>
    <div className="text-right md:col-span-2"><button className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white" type="submit">{continueProcessing ? "保存并处理下一条" : "保存联系记录"}</button></div>
  </form>;
}
