import { saveWechatMessageTemplate } from "@/app/(app)/settings/actions";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import {
  TALENT_LEVELS,
  TALENT_LEVEL_LABELS,
  WECHAT_TEMPLATE_VARIABLES,
} from "@/lib/constants";
import type { Tables } from "@/types/database";

type Template = Tables<"wechat_message_templates">;

type Props = {
  error?: string;
  feedbackLevel?: string;
  notice?: string;
  templates: Template[];
};

const inputClassName =
  "rounded-lg border border-[#dfe5e1] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#31594b]";

export function WechatTemplateSettings({
  error,
  feedbackLevel,
  notice,
  templates,
}: Props) {
  const byLevel = new Map(templates.map((template) => [template.talent_level, template]));

  return (
    <section className="mt-8">
      <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">WECHAT TEMPLATES</p>
      <h2 className="mt-2 text-xl font-semibold text-[#26332e]">A/B/C 微信招呼语</h2>
      <p className="mt-2 text-sm text-slate-500">
        允许变量：{WECHAT_TEMPLATE_VARIABLES.join("、")}。修改模板只影响之后新创建的微信任务，已经创建的任务使用创建时保存的快照。
      </p>
      <p className="mt-2 text-sm text-slate-500">
        微信备注自动使用达人资料中的昵称，无需重复配置。
      </p>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {TALENT_LEVELS.map((level) => {
          const template = byLevel.get(level);
          const showSuccess = feedbackLevel === level && notice === "saved";
          const showError = feedbackLevel === level && error;
          return (
            <form
              action={saveWechatMessageTemplate}
              className="rounded-2xl border border-[#e7ebe8] bg-white p-5 shadow-sm"
              key={level}
            >
              <input name="talent_level" type="hidden" value={level} />
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-[#26332e]">{TALENT_LEVEL_LABELS[level]}</h3>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${template ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {template ? template.enabled ? "已启用" : "已停用" : "尚未配置"}
                </span>
              </div>

              {showSuccess ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">模板已保存。</p> : null}
              {showError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p> : null}

              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-[#35443e]">
                  模板名称
                  <input className={inputClassName} defaultValue={template?.template_name ?? ""} maxLength={100} name="template_name" required />
                </label>
                <label className="grid gap-2 text-sm font-medium text-[#35443e]">
                  好友申请招呼语
                  <textarea className={`${inputClassName} min-h-32 resize-y`} defaultValue={template?.greeting_message ?? ""} maxLength={500} name="greeting_message" required />
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-[#35443e]">
                  <input className="size-4 accent-[#31594b]" defaultChecked={template?.enabled ?? false} name="enabled" type="checkbox" />
                  启用该等级模板
                </label>
              </div>

              <FormSubmitButton
                className="mt-5 w-full rounded-lg bg-[#31594b] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#284a3e] disabled:cursor-not-allowed disabled:bg-[#91a59e]"
                label="保存模板"
                pendingLabel="正在保存…"
              />
            </form>
          );
        })}
      </div>
    </section>
  );
}
