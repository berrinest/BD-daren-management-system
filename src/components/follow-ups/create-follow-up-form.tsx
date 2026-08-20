import { recordFollowUpAndScheduleNext } from "@/app/(app)/talents/follow-up-actions";
import {
  FOLLOW_UP_METHOD_LABELS,
  FOLLOW_UP_METHODS,
  FOLLOW_UP_RESULT_LABELS,
  FOLLOW_UP_RESULTS,
  TALENT_STAGE_LABELS,
  TALENT_STAGES,
  TASK_TYPE_LABELS,
  TASK_TYPES,
} from "@/lib/constants";
import { formatDateTime, toShanghaiDateTimeLocalValue } from "@/lib/formatters/date";

type CreateFollowUpFormProps = {
  autoCompleteTask?: boolean;
  initialTaskId?: string;
  talentId: string;
  pendingTasks: Array<{
    id: string;
    task_type: string;
    due_at: string;
    notes: string | null;
  }>;
};

export function CreateFollowUpForm({
  autoCompleteTask = false,
  initialTaskId,
  talentId,
  pendingTasks,
}: CreateFollowUpFormProps) {
  return (
    <form
      action={recordFollowUpAndScheduleNext}
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
      <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
        当前处理任务
        <select
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue={initialTaskId ?? ""}
          name="task_id"
        >
          <option value="">不关联当前任务</option>
          {pendingTasks.map((task) => (
            <option key={task.id} value={task.id}>
              {TASK_TYPE_LABELS[task.task_type as keyof typeof TASK_TYPE_LABELS] ?? task.task_type} · {formatDateTime(task.due_at)}{task.notes ? ` · ${task.notes}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
        <input
          className="size-4 accent-[#31594b]"
          defaultChecked={autoCompleteTask}
          name="complete_current_task"
          type="checkbox"
        />
        同时完成所选当前任务
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        下一阶段
        <select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue="" name="next_stage">
          <option value="">保持当前阶段</option>
          {TALENT_STAGES.map((value) => <option key={value} value={value}>{TALENT_STAGE_LABELS[value]}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        下一次跟进时间
        <input className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" name="next_task_due_at" type="datetime-local" />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        下一任务类型
        <select className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" defaultValue="follow_up" name="next_task_type">
          {TASK_TYPES.map((value) => <option key={value} value={value}>{TASK_TYPE_LABELS[value]}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        下一任务备注
        <input className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5" maxLength={2000} name="next_task_notes" placeholder="仅在设置下次时间时创建任务" />
      </label>
      <div className="md:col-span-2 md:text-right">
        <button
          className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]"
          type="submit"
        >
          保存并处理下一步
        </button>
      </div>
    </form>
  );
}
