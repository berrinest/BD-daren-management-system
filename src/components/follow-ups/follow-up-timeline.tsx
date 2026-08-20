import {
  getFollowUpMethodLabel,
  getFollowUpResultLabel,
} from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import type { Tables } from "@/types/database";

type FollowUpRecord = Pick<
  Tables<"follow_up_records">,
  "id" | "method" | "notes" | "occurred_at" | "result" | "task_id"
>;

type FollowUpTimelineProps = {
  records: FollowUpRecord[];
};

export function FollowUpTimeline({ records }: FollowUpTimelineProps) {
  if (records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-[#dfe5e1] px-4 py-8 text-center text-sm text-slate-400">
        暂无跟进记录
      </p>
    );
  }

  return (
    <ol className="grid gap-0">
      {records.map((record, index) => (
        <li className="relative grid grid-cols-[20px_1fr] gap-3" key={record.id}>
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2.5 rounded-full bg-[#31594b]" />
            {index < records.length - 1 ? (
              <span className="w-px flex-1 bg-[#dfe5e1]" />
            ) : null}
          </div>
          <article className="pb-6">
            <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-center">
              <h3 className="text-sm font-semibold text-[#35443e]">
                {record.task_id ? "任务已完成" : getFollowUpResultLabel(record.result)}
              </h3>
              <time className="text-xs text-slate-400">
                {formatDateTime(record.occurred_at)}
              </time>
            </div>
            <p className="mt-1 text-xs font-medium text-[#668074]">
              {getFollowUpMethodLabel(record.method)}
            </p>
            {record.notes ? (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {record.notes}
              </p>
            ) : (
              <p className="mt-2 text-sm text-slate-400">无备注</p>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
