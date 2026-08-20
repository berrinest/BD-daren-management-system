import { getResourceContactMethodLabel, getResourceContactResultLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import type { Tables } from "@/types/database";

type Record = Pick<Tables<"resource_contact_records">, "id" | "method" | "notes" | "occurred_at" | "result">;

export function ResourceContactTimeline({ records }: { records: Record[] }) {
  if (records.length === 0) return <p className="rounded-xl border border-dashed border-[#dfe5e1] px-4 py-8 text-center text-sm text-slate-400">暂无联系记录</p>;

  return <ol>{records.map((record, index) => <li className="relative grid grid-cols-[20px_1fr] gap-3" key={record.id}><div className="flex flex-col items-center"><span className="mt-1.5 size-2.5 rounded-full bg-[#31594b]" />{index < records.length - 1 ? <span className="w-px flex-1 bg-[#dfe5e1]" /> : null}</div><article className="pb-6"><div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center"><h3 className="text-sm font-semibold text-[#35443e]">{getResourceContactResultLabel(record.result)}</h3><time className="text-xs text-slate-400">{formatDateTime(record.occurred_at)}</time></div><p className="mt-1 text-xs font-medium text-[#668074]">{getResourceContactMethodLabel(record.method)}</p><p className={`mt-2 whitespace-pre-wrap text-sm leading-6 ${record.notes ? "text-slate-600" : "text-slate-400"}`}>{record.notes || "无备注"}</p></article></li>)}</ol>;
}
