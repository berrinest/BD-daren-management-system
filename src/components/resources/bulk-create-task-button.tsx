"use client";

import { useFormStatus } from "react-dom";

import { bulkCreateResourceTasks } from "@/app/(app)/tasks/actions";

export function BulkCreateTaskButton() {
  const { pending } = useFormStatus();
  return (
    <button
      className="rounded-lg bg-[#31594b] px-3 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      formAction={bulkCreateResourceTasks}
      type="submit"
    >
      {pending ? "正在创建…" : "创建BD任务"}
    </button>
  );
}
