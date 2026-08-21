"use client";

import { useFormStatus } from "react-dom";

import { updateTalentResourceWechat } from "@/app/(app)/resources/actions";
import { CopyButton } from "@/components/ui/copy-button";

function SaveButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="rounded-lg bg-[#31594b] px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      disabled={disabled || pending}
      type="submit"
    >
      {pending ? "保存中…" : "保存"}
    </button>
  );
}

export function ResourceWechatForm({ editable, resourceId, wechat }: { editable: boolean; resourceId: string; wechat: string | null }) {
  return (
    <form action={updateTalentResourceWechat} className="flex items-center gap-2">
      <input name="resource_id" type="hidden" value={resourceId} />
      <input
        aria-label="微信号"
        className="min-w-0 flex-1 rounded-lg border border-[#d6dfda] bg-white px-3 py-2 text-sm text-[#35443e]"
        defaultValue={wechat ?? ""}
        disabled={!editable}
        maxLength={100}
        name="wechat"
        placeholder="手动输入微信号"
      />
      <SaveButton disabled={!editable} />
      {wechat ? <CopyButton value={wechat} /> : null}
    </form>
  );
}
