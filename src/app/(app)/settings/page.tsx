import { redirect } from "next/navigation";

import { AgentInstanceList } from "@/components/agent/agent-instance-list";
import { WechatTemplateSettings } from "@/components/settings/wechat-template-settings";
import { listAgentInstances } from "@/lib/data/agent-instances";
import { createClient } from "@/lib/supabase/server";

type SettingsPageProps = {
  searchParams: Promise<{
    level?: string;
    templateError?: string;
    templateNotice?: string;
  }>;
};

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const feedback = await searchParams;
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const [
    { data: agents, error },
    { data: templates, error: templateQueryError },
  ] = await Promise.all([
    listAgentInstances(supabase, userId),
    supabase
      .from("wechat_message_templates")
      .select("*")
      .eq("user_id", userId)
      .order("talent_level", { ascending: true }),
  ]);

  return (
    <main className="p-5 md:p-8">
      <section className="mx-auto max-w-5xl">
        <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">LOCAL AGENT</p>
        <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">Windows Agent</h1>
        <p className="mt-2 text-sm text-slate-500">
          查看已绑定设备、运行状态和最近心跳。本阶段仅建立连接，不执行微信操作。
        </p>

        {error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            Agent 状态暂时无法读取。若数据库 migration 尚未同步，请先完成 Phase 8.1 数据库同步。
          </p>
        ) : null}

        {!error ? <AgentInstanceList initialAgents={agents ?? []} /> : null}

        {templateQueryError ? (
          <p className="mt-8 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            微信模板暂时无法读取。数据库 migration 尚未同步时，请先完成 Phase 10 数据库发布。
          </p>
        ) : (
          <WechatTemplateSettings
            error={feedback.templateError}
            feedbackLevel={feedback.level}
            notice={feedback.templateNotice}
            templates={templates ?? []}
          />
        )}
      </section>
    </main>
  );
}
