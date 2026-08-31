alter table public.tasks
  add column execution_wechat_id text,
  add column execution_expected_nickname text,
  add column execution_talent_level text,
  add column execution_greeting_message text,
  add column execution_remark text,
  add column agent_finished_at timestamptz,
  add column agent_duration_ms bigint,
  add column agent_stop_reason text,
  add column agent_error_code text,
  add column agent_result_payload jsonb,
  add column agent_evidence_ref text;

alter table public.tasks
  add constraint tasks_execution_wechat_id_valid check (
    execution_wechat_id is null
    or (
      execution_wechat_id = trim(execution_wechat_id)
      and char_length(execution_wechat_id) between 1 and 100
    )
  ),
  add constraint tasks_execution_expected_nickname_valid check (
    execution_expected_nickname is null
    or (
      execution_expected_nickname = trim(execution_expected_nickname)
      and char_length(execution_expected_nickname) between 1 and 100
    )
  ),
  add constraint tasks_execution_talent_level_valid check (
    execution_talent_level is null
    or execution_talent_level in ('A', 'B', 'C')
  ),
  add constraint tasks_execution_greeting_message_valid check (
    execution_greeting_message is null
    or (
      execution_greeting_message = trim(execution_greeting_message)
      and char_length(execution_greeting_message) between 1 and 500
    )
  ),
  add constraint tasks_execution_remark_valid check (
    execution_remark is null
    or (
      execution_remark = trim(execution_remark)
      and char_length(execution_remark) between 1 and 100
    )
  ),
  add constraint tasks_wechat_execution_snapshot_all_or_none check (
    (
      execution_wechat_id is null
      and execution_expected_nickname is null
      and execution_talent_level is null
      and execution_greeting_message is null
      and execution_remark is null
    )
    or (
      task_type = 'wechat_add_friend'
      and talent_id is not null
      and resource_id is null
      and execution_wechat_id is not null
      and execution_expected_nickname is not null
      and execution_talent_level is not null
      and execution_greeting_message is not null
      and execution_remark is not null
    )
  ),
  add constraint tasks_agent_duration_ms_valid check (
    agent_duration_ms is null or agent_duration_ms >= 0
  ),
  add constraint tasks_agent_stop_reason_valid check (
    agent_stop_reason is null
    or (
      agent_stop_reason = trim(agent_stop_reason)
      and char_length(agent_stop_reason) between 1 and 100
    )
  ),
  add constraint tasks_agent_error_code_valid check (
    agent_error_code is null
    or (
      agent_error_code = trim(agent_error_code)
      and char_length(agent_error_code) between 1 and 100
    )
  ),
  add constraint tasks_agent_result_payload_valid check (
    agent_result_payload is null
    or jsonb_typeof(agent_result_payload) = 'object'
  ),
  add constraint tasks_agent_evidence_ref_valid check (
    agent_evidence_ref is null
    or (
      agent_evidence_ref = trim(agent_evidence_ref)
      and char_length(agent_evidence_ref) between 1 and 200
    )
  );

alter table public.tasks
  drop constraint tasks_agent_execution_status_valid,
  add constraint tasks_agent_execution_status_valid check (
    agent_execution_status is null
    or agent_execution_status in (
      'claimed',
      'running',
      'ready_to_submit',
      'safe_stop',
      'timeout',
      'failed'
    )
  );

update public.tasks
set
  agent_finished_at = coalesce(updated_at, now()),
  agent_duration_ms = greatest(
    0::bigint,
    floor(
      extract(epoch from (coalesce(updated_at, now()) - coalesce(started_at, updated_at, now())))
      * 1000
    )::bigint
  ),
  agent_stop_reason = 'LEGACY_AGENT_FAILURE',
  agent_error_code = 'LEGACY_AGENT_FAILURE',
  agent_result_payload = jsonb_build_object(
    'migrated', true,
    'previous_execution_status', 'failed'
  )
where status = 'in_progress'
  and agent_execution_status = 'failed'
  and agent_finished_at is null;

alter table public.tasks
  add constraint tasks_agent_execution_result_consistency check (
    (
      agent_execution_status is null
      or agent_execution_status in ('claimed', 'running')
    )
    and agent_finished_at is null
    and agent_duration_ms is null
    and agent_stop_reason is null
    and agent_error_code is null
    and agent_result_payload is null
    and agent_evidence_ref is null
    or (
      agent_execution_status = 'ready_to_submit'
      and status = 'in_progress'
      and task_type = 'wechat_add_friend'
      and execution_wechat_id is not null
      and agent_finished_at is not null
      and agent_duration_ms is not null
      and agent_stop_reason is null
      and agent_error_code is null
      and agent_result_payload is not null
    )
    or (
      agent_execution_status in ('safe_stop', 'timeout', 'failed')
      and status = 'in_progress'
      and agent_finished_at is not null
      and agent_duration_ms is not null
      and agent_stop_reason is not null
      and agent_error_code is not null
      and agent_result_payload is not null
    )
    or status in ('completed', 'cancelled')
  );

create or replace function public.set_wechat_task_execution_snapshot()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_talent public.talents%rowtype;
  v_template public.wechat_message_templates%rowtype;
begin
  if tg_op = 'UPDATE' then
    if row(
      new.execution_wechat_id,
      new.execution_expected_nickname,
      new.execution_talent_level,
      new.execution_greeting_message,
      new.execution_remark
    ) is distinct from row(
      old.execution_wechat_id,
      old.execution_expected_nickname,
      old.execution_talent_level,
      old.execution_greeting_message,
      old.execution_remark
    ) then
      raise exception 'WeChat execution snapshot is immutable'
        using errcode = '23514';
    end if;

    return new;
  end if;

  if new.task_type <> 'wechat_add_friend' or new.talent_id is null then
    return new;
  end if;

  if auth.uid() is null or new.user_id <> auth.uid() then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  select talent.*
  into v_talent
  from public.talents as talent
  where talent.id = new.talent_id
    and talent.user_id = auth.uid()
    and talent.archived_at is null;

  if not found then
    raise exception 'Talent not found or unavailable'
      using errcode = 'P0002';
  end if;

  if v_talent.wechat is null or char_length(trim(v_talent.wechat)) = 0 then
    raise exception 'Talent WeChat id is required'
      using errcode = '23514';
  end if;

  select template.*
  into v_template
  from public.wechat_message_templates as template
  where template.user_id = auth.uid()
    and template.talent_level = v_talent.talent_level
    and template.enabled = true;

  if not found then
    raise exception 'Enabled WeChat message template is required'
      using errcode = '23514';
  end if;

  new.execution_wechat_id := trim(v_talent.wechat);
  new.execution_expected_nickname := trim(v_talent.nickname);
  new.execution_talent_level := v_talent.talent_level;
  new.execution_greeting_message := replace(
    replace(
      replace(v_template.greeting_message, '{nickname}', v_talent.nickname),
      '{platform}', v_talent.primary_platform
    ),
    '{account}', coalesce(v_talent.platform_account, '')
  );
  new.execution_remark := replace(
    replace(
      replace(v_template.remark_template, '{nickname}', v_talent.nickname),
      '{platform}', v_talent.primary_platform
    ),
    '{account}', coalesce(v_talent.platform_account, '')
  );

  return new;
end;
$$;

revoke all on function public.set_wechat_task_execution_snapshot() from public;
revoke all on function public.set_wechat_task_execution_snapshot() from anon;
revoke all on function public.set_wechat_task_execution_snapshot() from authenticated;

create trigger tasks_set_wechat_execution_snapshot
before insert or update of
  execution_wechat_id,
  execution_expected_nickname,
  execution_talent_level,
  execution_greeting_message,
  execution_remark
on public.tasks
for each row
execute function public.set_wechat_task_execution_snapshot();

create index tasks_user_wechat_execution_queue_idx
on public.tasks (user_id, status, agent_execution_status, due_at, created_at)
where task_type = 'wechat_add_friend';

do $$
begin
  if exists (
    select 1
    from public.tasks
    where task_type = 'wechat_add_friend'
      and status in ('pending', 'in_progress')
      and talent_id is not null
    group by user_id, talent_id
    having count(*) > 1
  ) then
    raise exception 'Duplicate active WeChat tasks exist; resolve them before applying this migration'
      using errcode = '23505';
  end if;
end;
$$;

create unique index tasks_one_active_wechat_task_per_talent_idx
on public.tasks (user_id, talent_id)
where task_type = 'wechat_add_friend'
  and status in ('pending', 'in_progress')
  and talent_id is not null;

comment on column public.tasks.execution_wechat_id is
  'Immutable-at-creation WeChat identifier snapshot used by the Windows Executor.';
comment on column public.tasks.execution_expected_nickname is
  'Expected nickname snapshot used for strict target matching.';
comment on column public.tasks.execution_talent_level is
  'A/B/C outreach level snapshot captured when the task is created.';
comment on column public.tasks.execution_greeting_message is
  'Fully rendered greeting snapshot. The Executor does not interpret template variables.';
comment on column public.tasks.execution_remark is
  'Fully rendered WeChat remark snapshot.';
comment on column public.tasks.agent_finished_at is
  'Time when the current Agent execution attempt reached a terminal execution state.';
comment on column public.tasks.agent_duration_ms is
  'Measured duration of the current Agent execution attempt in milliseconds.';
comment on column public.tasks.agent_stop_reason is
  'Structured safety stop reason such as TARGET_NOT_FOUND or UNEXPECTED_WINDOW.';
comment on column public.tasks.agent_error_code is
  'Structured Executor error code for diagnostics.';
comment on column public.tasks.agent_result_payload is
  'Sanitized JSON execution summary; screenshots and OCR full text are not stored here.';
comment on column public.tasks.agent_evidence_ref is
  'Opaque local evidence reference without an absolute filesystem path.';
