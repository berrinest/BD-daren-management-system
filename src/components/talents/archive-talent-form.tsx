"use client";

import { archiveTalent } from "@/app/(app)/talents/actions";

type ArchiveTalentFormProps = {
  talentId: string;
};

export function ArchiveTalentForm({ talentId }: ArchiveTalentFormProps) {
  return (
    <form
      action={archiveTalent}
      onSubmit={(event) => {
        if (!window.confirm("归档后该达人将从默认列表隐藏，确认继续吗？")) {
          event.preventDefault();
        }
      }}
    >
      <input name="talent_id" type="hidden" value={talentId} />
      <button
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
        type="submit"
      >
        归档达人
      </button>
    </form>
  );
}
