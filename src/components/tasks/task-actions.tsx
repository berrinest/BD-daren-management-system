import {
  cancelTask,
  completeTask,
} from "@/app/(app)/tasks/actions";

type TaskActionsProps = {
  returnTo: "talent" | "tasks";
  talentId: string;
  taskId: string;
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
  return (
    <div className="flex flex-wrap gap-2">
      <form action={completeTask}>
        <TaskActionFields {...props} />
        <button
          className="rounded-lg bg-[#31594b] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#284a3e]"
          type="submit"
        >
          完成
        </button>
      </form>
      <form action={cancelTask}>
        <TaskActionFields {...props} />
        <button
          className="rounded-lg border border-[#dfe5e1] px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-[#f4f6f4]"
          type="submit"
        >
          取消
        </button>
      </form>
    </div>
  );
}
