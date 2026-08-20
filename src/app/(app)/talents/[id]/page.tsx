import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { CreateFollowUpForm } from "@/components/follow-ups/create-follow-up-form";
import { FollowUpTimeline } from "@/components/follow-ups/follow-up-timeline";
import { ArchiveTalentForm } from "@/components/talents/archive-talent-form";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskActions } from "@/components/tasks/task-actions";
import { getTalentPlatformLabel, getTalentPriorityLabel, getTalentStageLabel, getTaskTypeLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

type TalentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    followUpError?: string;
    followUpNotice?: string;
    taskError?: string;
    taskNotice?: string;
  }>;
};

export default async function TalentDetailPage({ params, searchParams }: TalentDetailPageProps) {
  const [{ id }, taskMessage] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims?.sub;
  if (!userId) redirect("/login");

  const [
    { data: talent, error },
    { data: pendingTasks, error: tasksError },
    { data: followUpRecords, error: followUpsError },
  ] = await Promise.all([
    supabase.from("talents").select("*").eq("id", id).eq("user_id", userId).is("archived_at", null).maybeSingle(),
    supabase.from("tasks").select("id, talent_id, task_type, due_at, notes").eq("talent_id", id).eq("user_id", userId).eq("status", "pending").order("due_at", { ascending: true }),
    supabase.from("follow_up_records").select("id, method, notes, occurred_at, result").eq("talent_id", id).eq("user_id", userId).order("occurred_at", { ascending: false }),
  ]);
  if (error || !talent) notFound();

  const details = [
    ["主要平台", getTalentPlatformLabel(talent.primary_platform)],
    ["平台账号", talent.platform_account || "未填写"],
    ["微信号", talent.wechat || "未填写"],
    ["粉丝数量", talent.follower_count?.toLocaleString("zh-CN") ?? "未填写"],
    ["优先级", getTalentPriorityLabel(talent.priority)],
    ["当前阶段", getTalentStageLabel(talent.stage)],
  ];

  return (
    <main className="p-5 md:p-8"><section className="mx-auto max-w-5xl">
      <Link className="text-sm font-medium text-[#557064] hover:underline" href="/talents">← 返回达人库</Link>
      <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TALENT PROFILE</p>
            <h1 className="mt-2 text-2xl font-semibold text-[#26332e]">{talent.nickname}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b] hover:bg-[#f4f6f4]" href={`/talents/${talent.id}/edit`}>
              编辑资料
            </Link>
            <ArchiveTalentForm talentId={talent.id} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">{talent.tags.length > 0 ? talent.tags.map((tag) => <span className="rounded-full bg-[#eef4f1] px-2.5 py-1 text-xs text-[#48685b]" key={tag}>{tag}</span>) : <span className="text-sm text-slate-400">暂无标签</span>}</div>
        <dl className="mt-7 grid gap-4 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-3">{details.map(([label, value]) => <div className="rounded-xl bg-[#f8faf8] p-4" key={label}><dt className="text-xs font-medium text-slate-400">{label}</dt><dd className="mt-1.5 text-sm font-medium text-[#35443e]">{value}</dd></div>)}</dl>
        {talent.profile_url ? <p className="mt-6 text-sm"><a className="font-medium text-[#31594b] hover:underline" href={talent.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a></p> : null}
        <div className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">联系备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{talent.notes || "暂无备注"}</p></div>
      </div>

      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">FOLLOW-UP HISTORY</p>
          <h2 className="mt-2 text-lg font-semibold text-[#26332e]">跟进记录</h2>
          <p className="mt-1 text-sm text-slate-500">记录每一次真实沟通，保留完整时间轴。</p>
        </div>

        {taskMessage.followUpError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{taskMessage.followUpError}</p> : null}
        {taskMessage.followUpNotice === "created" ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">跟进记录与下一步处理成功。</p> : null}

        <div className="mt-5">
          <CreateFollowUpForm pendingTasks={pendingTasks ?? []} talentId={talent.id} />
        </div>

        <div className="mt-7 border-t border-[#edf0ee] pt-6">
          <h3 className="mb-4 text-sm font-semibold text-[#35443e]">沟通时间轴</h3>
          {followUpsError ? <p className="text-sm text-red-700">跟进记录加载失败，请稍后重试。</p> : <FollowUpTimeline records={followUpRecords ?? []} />}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">CURRENT TASKS</p>
          <h2 className="mt-2 text-lg font-semibold text-[#26332e]">当前任务</h2>
          <p className="mt-1 text-sm text-slate-500">创建下一次行动，并处理该达人的待办任务。</p>
        </div>

        {taskMessage.taskError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{taskMessage.taskError}</p> : null}
        {taskMessage.taskNotice === "created" ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">任务创建成功。</p> : null}

        {tasksError ? <p className="mt-5 text-sm text-red-700">任务加载失败，请稍后重试。</p> : null}
        {!tasksError && pendingTasks?.length === 0 ? <p className="mt-5 rounded-xl border border-dashed border-[#dfe5e1] px-4 py-6 text-center text-sm text-slate-400">当前没有待处理任务</p> : null}
        {!tasksError && pendingTasks && pendingTasks.length > 0 ? (
          <div className="mt-5 grid gap-3">
            {pendingTasks.map((task) => (
              <article className="flex flex-col justify-between gap-3 rounded-xl border border-[#e4e9e6] p-4 sm:flex-row sm:items-center" key={task.id}>
                <div>
                  <h3 className="text-sm font-semibold text-[#35443e]">{getTaskTypeLabel(task.task_type)}</h3>
                  <p className="mt-1 text-xs text-slate-500">到期：{formatDateTime(task.due_at)}</p>
                  {task.notes ? <p className="mt-2 text-sm text-slate-600">{task.notes}</p> : null}
                </div>
                <TaskActions returnTo="talent" talentId={talent.id} taskId={task.id} />
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-6 border-t border-[#edf0ee] pt-6">
          <h3 className="mb-3 text-sm font-semibold text-[#35443e]">创建下一次跟进任务</h3>
          <CreateTaskForm talentId={talent.id} />
        </div>
      </section>
    </section></main>
  );
}
