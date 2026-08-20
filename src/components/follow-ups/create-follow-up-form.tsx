import { createFollowUpRecord } from "@/app/(app)/talents/follow-up-actions";
import {
  FOLLOW_UP_METHOD_LABELS,
  FOLLOW_UP_METHODS,
  FOLLOW_UP_RESULT_LABELS,
  FOLLOW_UP_RESULTS,
} from "@/lib/constants";
import { toShanghaiDateTimeLocalValue } from "@/lib/formatters/date";

type CreateFollowUpFormProps = {
  talentId: string;
};

export function CreateFollowUpForm({ talentId }: CreateFollowUpFormProps) {
  return (
    <form
      action={createFollowUpRecord}
      className="grid gap-4 rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4 md:grid-cols-2"
    >
      <input name="talent_id" type="hidden" value={talentId} />
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        沟通时间
        <input
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue={toShanghaiDateTimeLocalValue()}
          name="occurred_at"
          required
          type="datetime-local"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        联系方式
        <select
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue="wechat"
          name="method"
        >
          {FOLLOW_UP_METHODS.map((value) => (
            <option key={value} value={value}>
              {FOLLOW_UP_METHOD_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
        沟通结果
        <select
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue="first_application"
          name="result"
        >
          {FOLLOW_UP_RESULTS.map((value) => (
            <option key={value} value={value}>
              {FOLLOW_UP_RESULT_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
        沟通备注
        <textarea
          className="min-h-24 resize-y rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          maxLength={2000}
          name="notes"
          placeholder="记录对方回复、合作意向或其他关键信息"
        />
      </label>
      <div className="md:col-span-2 md:text-right">
        <button
          className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]"
          type="submit"
        >
          保存跟进记录
        </button>
      </div>
    </form>
  );
}
