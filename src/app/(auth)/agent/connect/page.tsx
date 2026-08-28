import { redirect } from "next/navigation";
import { z } from "zod";

import { getSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  callback: z.url().refine((value) => {
    const url = new URL(value);
    return url.protocol === "http:"
      && url.hostname === "127.0.0.1"
      && url.pathname === "/callback"
      && Boolean(url.port);
  }, "回调地址无效"),
  state: z.string().regex(/^[A-Za-z0-9_-]{32,128}$/, "授权状态无效"),
});

export default async function AgentConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ callback?: string; state?: string }>;
}) {
  const input = querySchema.safeParse(await searchParams);
  if (!input.success) {
    return <section className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-[#26332e]">Agent 授权请求无效</h1>
      <p className="mt-3 text-sm text-red-700">请关闭此页面并重新运行 Windows Agent login。</p>
    </section>;
  }

  const supabase = await createClient();
  const [{ data: sessionData }, { data: claimsData }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getClaims(),
  ]);
  const session = sessionData.session;
  const userId = claimsData?.claims?.sub;
  if (!session || !userId || session.user.id !== userId) {
    const loginQuery = new URLSearchParams(input.data);
    redirect(`/login?${loginQuery}`);
  }

  const env = getSupabasePublicEnv();
  return <section className="w-full max-w-lg rounded-2xl border border-[#e7ebe8] bg-white p-8 shadow-sm">
    <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">WINDOWS AGENT</p>
    <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">绑定当前 BD 账号</h1>
    <p className="mt-3 text-sm leading-6 text-slate-600">
      授权后，本机 Agent 可以代表当前账号读取和执行你创建的 Agent 任务。授权信息只发送到本机 127.0.0.1，并保存到 Windows 凭据管理器。
    </p>
    <div className="mt-5 rounded-xl bg-[#f8faf8] p-4 text-sm text-slate-600">
      <p>账号：{session.user.email ?? "当前登录用户"}</p>
      <p className="mt-1">回调：本机 Windows Agent</p>
    </div>
    <form action={input.data.callback} className="mt-6" method="post">
      <input name="state" type="hidden" value={input.data.state} />
      <input name="refresh_token" type="hidden" value={session.refresh_token} />
      <input name="supabase_url" type="hidden" value={env.NEXT_PUBLIC_SUPABASE_URL} />
      <input name="supabase_publishable_key" type="hidden" value={env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} />
      <button className="w-full rounded-lg bg-[#31594b] px-4 py-3 text-sm font-semibold text-white hover:bg-[#284a3e]" type="submit">
        授权并绑定本机 Agent
      </button>
    </form>
    <p className="mt-4 text-xs leading-5 text-slate-400">请仅在你本人启动 Agent login 后确认。此操作不会授权微信自动操作。</p>
  </section>;
}
