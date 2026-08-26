import { createTask } from "@/app/(app)/tasks/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { toShanghaiTomorrowDateTimeLocalValue } from "@/lib/formatters/date";

export function CreateWechatTaskForm({ talentId }: { talentId: string }) {
  return (
    <form action={createTask} className="mt-4 grid gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <input name="talent_id" type="hidden" value={talentId} />
      <input name="task_type" type="hidden" value="wechat_add_friend" />
      <input name="notes" type="hidden" value="通过 Windows Agent 辅助准备，人工确认并发送好友申请" />
      <label className="grid gap-2 text-sm font-medium text-[#35443e]">
        执行时间
        <input
          className="rounded-lg border border-emerald-200 bg-white px-3 py-2.5"
          defaultValue={toShanghaiTomorrowDateTimeLocalValue()}
          name="due_at"
          required
          type="datetime-local"
        />
      </label>
      <FormSubmitButton
        className="rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e] disabled:cursor-not-allowed disabled:bg-[#91a59e]"
        label="创建微信添加任务"
        pendingLabel="正在创建…"
      />
    </form>
  );
}
