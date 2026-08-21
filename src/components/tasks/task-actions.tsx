import {
  cancelTask,
  completeTask,
} from "@/app/(app)/tasks/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";

type TaskActionsProps = {
  returnTo: "dashboard" | "talent" | "tasks" | "work";
  talentId: string;
  taskId: string;
  showComplete?: boolean;
};

function TaskActionFields({
  returnTo,
  talentId,
  taskId,
}: TaskActionsProps) {
  return (
    <>
      <input name="task_id" type="hidden" value={taskId} />
      <input name="talent_id" type="hidden" value={talentId} />
      <input name="return_to" type="hidden" value={returnTo} />
    </>
  );
}

export function TaskActions(props: TaskActionsProps) {
  const { showComplete = true } = props;
  return (
    <div className="flex flex-wrap gap-2">
      {showComplete ? <form action={completeTask}>
        <TaskActionFields {...props} />
        <FormSubmitButton className="rounded-lg bg-[#31594b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#284a3e] disabled:cursor-not-allowed disabled:bg-[#91a59e]" label="完成" pendingLabel="处理中…" />
      </form> : null}
      <form action={cancelTask}>
        <TaskActionFields {...props} />
        <FormSubmitButton className="rounded-lg border border-[#dfe5e1] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[#f4f6f4] disabled:cursor-not-allowed disabled:opacity-50" label="取消" pendingLabel="处理中…" />
      </form>
    </div>
  );
}
