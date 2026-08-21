import Link from "next/link";

import {
  TALENT_CATEGORIES,
  TALENT_PLATFORMS,
  TALENT_PLATFORM_LABELS,
  TALENT_PRIORITIES,
  TALENT_PRIORITY_LABELS,
  TALENT_STAGES,
  TALENT_STAGE_LABELS,
} from "@/lib/constants";
import type { Tables } from "@/types/database";

type Talent = Tables<"talents">;

type TalentFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  initialValue?: Talent;
  submitLabel: string;
};

const inputClassName =
  "rounded-lg border border-[#dfe5e1] px-3 py-2.5 outline-none focus:border-[#31594b]";

export function TalentForm({
  action,
  cancelHref,
  initialValue,
  submitLabel,
}: TalentFormProps) {
  const initialCategory = TALENT_CATEGORIES.find(
    (category) => category === initialValue?.tags[0],
  );
  const legacyCategory = initialValue?.tags[0] && !initialCategory
    ? initialValue.tags[0]
    : null;

  return (
    <form
      action={action}
      className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8"
    >
      {initialValue ? (
        <input name="talent_id" type="hidden" value={initialValue.id} />
      ) : null}
      <div className="grid gap-5 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          达人昵称 *
          <input
            className={inputClassName}
            defaultValue={initialValue?.nickname}
            maxLength={100}
            name="nickname"
            required
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          主要平台 *
          <select
            className={inputClassName}
            defaultValue={initialValue?.primary_platform ?? "douyin"}
            name="primary_platform"
          >
            {TALENT_PLATFORMS.map((value) => (
              <option key={value} value={value}>
                {TALENT_PLATFORM_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          平台账号
          <input
            className={inputClassName}
            defaultValue={initialValue?.platform_account ?? ""}
            maxLength={200}
            name="platform_account"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          微信号
          <input
            className={inputClassName}
            defaultValue={initialValue?.wechat ?? ""}
            maxLength={100}
            name="wechat"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          主页链接
          <input
            className={inputClassName}
            defaultValue={initialValue?.profile_url ?? ""}
            name="profile_url"
            placeholder="https://"
            type="url"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          粉丝数量
          <input
            className={inputClassName}
            defaultValue={initialValue?.follower_count ?? ""}
            min="0"
            name="follower_count"
            step="1"
            type="number"
          />
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          优先级
          <select
            className={inputClassName}
            defaultValue={initialValue?.priority ?? "normal"}
            name="priority"
          >
            {TALENT_PRIORITIES.map((value) => (
              <option key={value} value={value}>
                {TALENT_PRIORITY_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e]">
          当前阶段
          <select
            className={inputClassName}
            defaultValue={initialValue?.stage ?? "not_contacted"}
            name="stage"
          >
            {TALENT_STAGES.map((value) => (
              <option key={value} value={value}>
                {TALENT_STAGE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
          赛道类别 *
          <select
            className={inputClassName}
            defaultValue={initialCategory ?? ""}
            name="tags"
            required
          >
            <option disabled value="">请选择赛道类别</option>
            {legacyCategory ? (
              <option value={legacyCategory}>{legacyCategory}（原分类）</option>
            ) : null}
            {TALENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-medium text-[#35443e] md:col-span-2">
          联系备注
          <textarea
            className={`${inputClassName} min-h-28 resize-y`}
            defaultValue={initialValue?.notes ?? ""}
            maxLength={2000}
            name="notes"
          />
        </label>
      </div>
      <div className="mt-7 flex justify-end gap-3 border-t border-[#edf0ee] pt-6">
        <Link
          className="rounded-lg border border-[#dfe5e1] px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-[#f4f6f4]"
          href={cancelHref}
        >
          取消
        </Link>
        <button
          className="rounded-lg bg-[#31594b] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e]"
          type="submit"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
