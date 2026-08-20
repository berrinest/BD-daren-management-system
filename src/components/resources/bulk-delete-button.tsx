"use client";

import { useFormStatus } from "react-dom";

import { bulkDeleteTalentResources } from "@/app/(app)/resources/actions";

export function BulkDeleteButton() {
  const { pending } = useFormStatus();
  return <button className="rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" disabled={pending} formAction={bulkDeleteTalentResources} onClick={(event) => { if (!window.confirm("确认删除所选资源？其联系记录也会一并删除，且无法恢复。")) event.preventDefault(); }} type="submit">{pending ? "处理中…" : "删除"}</button>;
}
