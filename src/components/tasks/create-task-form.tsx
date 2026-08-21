import { createTask } from "@/app/(app)/tasks/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { TASK_TYPES, TASK_TYPE_LABELS } from "@/lib/constants";
import { toShanghaiTomorrowDateTimeLocalValue } from "@/lib/formatters/date";

type CreateTaskFormProps = {
  talentId: string;
};

export function CreateTaskForm({ talentId }: CreateTaskFormProps) {
  const defaultDueAt = toShanghaiTomorrowDateTimeLocalValue();

  return (
    <form
      action={createTask}
      className="grid gap-4 rounded-xl border border-[#e4e9e6] bg-[#f8faf8] p-4 md:grid-cols-2"
    >
      <input name="talent_id" type="hidden" value={talentId} />
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        任务类型
        <select
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue="follow_up"
          name="task_type"
        >
          {TASK_TYPES.map((value) => (
            <option key={value} value={value}>
              {TASK_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        到期时间
        <input
          className="rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          defaultValue={defaultDueAt}
          name="due_at"
          required
          type="datetime-local"
        />
      </label>
      <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
        任务备注
        <textarea
          className="min-h-20 resize-y rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5"
          maxLength={2000}
          name="notes"
          placeholder="例如：再次发送合作介绍"
        />
      </label>
      <div className="md:col-span-2 md:text-right">
        <FormSubmitButton className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e] disabled:cursor-not-allowed disabled:bg-[#91a59e]" label="创建任务" pendingLabel="正在创建…" />
      </div>
    </form>
  );
}
