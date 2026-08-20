import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";

import { FollowUpTimeline } from "@/components/follow-ups/follow-up-timeline";
import { ArchiveTalentForm } from "@/components/talents/archive-talent-form";
import { CreateTaskForm } from "@/components/tasks/create-task-form";
import { TaskActions } from "@/components/tasks/task-actions";
import { CopyButton } from "@/components/ui/copy-button";
import { getTalentPlatformLabel, getTalentPriorityLabel, getTalentStageLabel, getTaskTypeLabel } from "@/lib/constants";
import { formatDateTime } from "@/lib/formatters/date";
import { createClient } from "@/lib/supabase/server";

type TalentDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    resourceNotice?: string;
    task?: string;
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
    supabase.from("follow_up_records").select("id, method, notes, occurred_at, result, task_id").eq("talent_id", id).eq("user_id", userId).order("occurred_at", { ascending: false }),
  ]);
  if (error || !talent) notFound();

  const requestedTaskId = taskMessage.task;
  const parsedTaskId = z.uuid().safeParse(requestedTaskId);
  let focusedTask: {
    due_at: string;
    id: string;
    notes: string | null;
    task_type: string;
  } | null = null;
  let focusedTaskUnavailable = false;

  if (requestedTaskId) {
    if (!parsedTaskId.success) {
      focusedTaskUnavailable = true;
    } else {
      const { data: requestedTask, error: requestedTaskError } = await supabase
        .from("tasks")
        .select("id, task_type, due_at, notes")
        .eq("id", parsedTaskId.data)
        .eq("talent_id", talent.id)
        .eq("user_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (requestedTaskError || !requestedTask) {
        focusedTaskUnavailable = true;
      } else {
        focusedTask = requestedTask;
      }
    }
  }

  const details = [
    { label: "主要平台", value: getTalentPlatformLabel(talent.primary_platform) },
    { copyValue: talent.platform_account, label: "平台账号", value: talent.platform_account || "未填写" },
    { copyValue: talent.wechat, label: "微信号", value: talent.wechat || "未填写" },
    { label: "粉丝数量", value: talent.follower_count?.toLocaleString("zh-CN") ?? "未填写" },
    { label: "优先级", value: getTalentPriorityLabel(talent.priority) },
    { label: "当前阶段", value: getTalentStageLabel(talent.stage) },
  ];

  return (
    <main className="p-5 md:p-8"><section className="mx-auto max-w-5xl">
      <Link className="text-sm font-medium text-[#557064] hover:underline" href="/talents">← 返回达人库</Link>
      {taskMessage.resourceNotice === "converted" || taskMessage.resourceNotice === "auto-converted" ? (
        <p className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          {taskMessage.resourceNotice === "auto-converted" ? "联系结果已保存，资源已自动转换为正式达人。" : "资源已转换为正式达人，可以开始创建任务和跟进。"}
        </p>
      ) : null}
      {focusedTask ? (
        <div className="mt-5 flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center" role="status">
          <div>
            <p className="text-xs font-semibold text-amber-700">当前处理任务</p>
            <p className="mt-1 text-sm font-medium text-amber-950">{getTaskTypeLabel(focusedTask.task_type)} · {formatDateTime(focusedTask.due_at)}</p>
            {focusedTask.notes ? <p className="mt-1 text-xs text-amber-800">{focusedTask.notes}</p> : null}
          </div>
          <a className="text-sm font-medium text-amber-800 hover:underline" href="#current-tasks">去完成任务 ↓</a>
        </div>
      ) : null}
      {focusedTaskUnavailable ? (
        <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600" role="alert">
          该任务已不存在或已处理，请重新选择任务。
        </p>
      ) : null}
      <div className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">TALENT PROFILE</p>
            <div className="mt-2 flex items-center gap-2"><h1 className="text-2xl font-semibold text-[#26332e]">{talent.nickname}</h1><CopyButton label="复制昵称" value={talent.nickname} /></div>
            <p className="mt-2 text-sm text-slate-500">
              赛道类别：<span className="font-medium text-[#31594b]">{talent.tags[0] || "未设置"}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="rounded-lg border border-[#d6dfda] px-4 py-2 text-sm font-medium text-[#31594b] hover:bg-[#f4f6f4]" href={`/talents/${talent.id}/edit`}>
              编辑资料
            </Link>
            <ArchiveTalentForm talentId={talent.id} />
          </div>
        </div>
        <dl className="mt-7 grid gap-4 border-t border-[#edf0ee] pt-6 sm:grid-cols-2 lg:grid-cols-3">{details.map(({ copyValue, label, value }) => <div className="rounded-xl bg-[#f8faf8] p-4" key={label}><dt className="text-xs font-medium text-slate-400">{label}</dt><dd className="mt-1.5 flex items-center justify-between gap-2 text-sm font-medium text-[#35443e]"><span className="min-w-0 truncate">{value}</span>{copyValue ? <CopyButton value={copyValue} /> : null}</dd></div>)}</dl>
        {talent.profile_url ? <div className="mt-6 flex flex-wrap items-center gap-3 text-sm"><a className="font-medium text-[#31594b] hover:underline" href={talent.profile_url} rel="noreferrer" target="_blank">打开达人主页 ↗</a><CopyButton label="复制主页链接" value={talent.profile_url} /></div> : null}
        <div className="mt-6 border-t border-[#edf0ee] pt-6"><h2 className="text-sm font-semibold text-[#35443e]">联系备注</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">{talent.notes || "暂无备注"}</p></div>
      </div>

      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">FOLLOW-UP HISTORY</p>
          <h2 className="mt-2 text-lg font-semibold text-[#26332e]">跟进记录</h2>
          <p className="mt-1 text-sm text-slate-500">资源联系历史和已完成任务会自动汇总到这里。</p>
        </div>

        <div className="mt-5 border-t border-[#edf0ee] pt-6">
          <h3 className="mb-4 text-sm font-semibold text-[#35443e]">沟通时间轴</h3>
          {followUpsError ? <p className="text-sm text-red-700">跟进记录加载失败，请稍后重试。</p> : <FollowUpTimeline records={followUpRecords ?? []} />}
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-[#e7ebe8] bg-white p-6 shadow-sm md:p-8" id="current-tasks">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-[#668074]">CURRENT TASKS</p>
          <h2 className="mt-2 text-lg font-semibold text-[#26332e]">当前任务</h2>
          <p className="mt-1 text-sm text-slate-500">创建下一次行动，并处理该达人的待办任务。</p>
        </div>

        {taskMessage.taskError ? <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{taskMessage.taskError}</p> : null}
        {taskMessage.taskNotice === "created" ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">任务创建成功。</p> : null}
        {taskMessage.taskNotice === "completed" ? <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">任务已完成，并已记入跟进时间轴。</p> : null}

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
