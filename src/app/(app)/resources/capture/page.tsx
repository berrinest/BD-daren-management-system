import Link from "next/link";

import { QuickResourceForm } from "@/components/resources/quick-resource-form";
import { captureResourcePrefillSchema } from "@/lib/validations";

type Props = {
  searchParams: Promise<{
    follower_count?: string;
    nickname?: string;
    notes?: string;
    platform_account?: string;
    primary_platform?: string;
    profile_url?: string;
  }>;
};

export default async function CaptureResourcePage({ searchParams }: Props) {
  const params = await searchParams;
  const capture = captureResourcePrefillSchema.parse({
    follower_count: params.follower_count,
    nickname: params.nickname ?? "",
    notes: params.notes ?? "",
    platform_account: params.platform_account ?? "",
    primary_platform: params.primary_platform ?? "other",
    profile_url: params.profile_url ?? "",
  });

  return <main className="p-5 md:p-8"><section className="mx-auto max-w-5xl">
    <Link className="text-sm font-medium text-[#557064] hover:underline" href="/resources">← 返回资源池</Link>
    <div className="mt-5"><p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">BROWSER CAPTURE</p><h1 className="mt-2 text-2xl font-semibold text-[#26332e]">插件采集预览</h1><p className="mt-2 text-sm text-slate-500">插件只提供公开资料草稿；请人工确认后再加入资源池。</p></div>
    <QuickResourceForm captureMode defaultFollowerCount={capture.follower_count} defaultNickname={capture.nickname} defaultNotes={capture.notes} defaultPlatform={capture.primary_platform} defaultPlatformAccount={capture.platform_account} defaultProfileUrl={capture.profile_url} defaultSourceDetail="浏览器插件采集" />
  </section></main>;
}
