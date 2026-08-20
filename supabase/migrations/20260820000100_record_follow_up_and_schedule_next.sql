create function public.record_follow_up_and_schedule_next(
  p_talent_id uuid,
  p_occurred_at timestamptz,
  p_method text,
  p_result text,
  p_notes text default null,
  p_task_id uuid default null,
  p_next_stage text default null,
  p_next_task_due_at timestamptz default null,
  p_next_task_type text default 'follow_up',
  p_next_task_notes text default null
)
returns table (
  follow_up_record_id uuid,
  completed_task_id uuid,
  next_task_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_follow_up_record_id uuid;
  v_completed_task_id uuid;
  v_next_task_id uuid;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  perform 1
  from public.talents
  where id = p_talent_id
    and user_id = v_user_id
    and archived_at is null
  for update;

  if not found then
    raise exception 'Talent not found or unavailable'
      using errcode = 'P0002';
  end if;

  if p_task_id is not null then
    perform 1
    from public.tasks
    where id = p_task_id
      and talent_id = p_talent_id
      and user_id = v_user_id
      and status = 'pending'
    for update;

    if not found then
      raise exception 'Pending task not found or unavailable'
        using errcode = 'P0002';
    end if;
  end if;

  if p_occurred_at is null then
    raise exception 'Follow-up time is required'
      using errcode = '22023';
  end if;

  if p_method is null or p_method not in (
    'wechat',
    'phone',
    'email',
    'platform_message',
    'other'
  ) then
    raise exception 'Invalid follow-up method'
      using errcode = '22023';
  end if;

  if p_result is null or p_result not in (
    'first_application',
    'reapplication',
    'accepted',
    'rejected',
    'replied',
    'interested',
    'quote_sent',
    'quote_accepted',
    'quote_rejected',
    'cooperation',
    'no_response',
    'other'
  ) then
    raise exception 'Invalid follow-up result'
      using errcode = '22023';
  end if;

  if p_next_stage is not null and p_next_stage not in (
    'not_contacted',
    'applied',
    'connected',
    'replied',
    'interested',
    'quoting',
    'confirmed',
    'completed',
    'rejected'
  ) then
    raise exception 'Invalid talent stage'
      using errcode = '22023';
  end if;

  if p_next_task_type is null or p_next_task_type not in (
    'follow_up',
    'quote_follow_up',
    'cooperation',
    'other'
  ) then
    raise exception 'Invalid next task type'
      using errcode = '22023';
  end if;

  insert into public.follow_up_records (
    user_id,
    talent_id,
    task_id,
    occurred_at,
    method,
    result,
    notes
  )
  values (
    v_user_id,
    p_talent_id,
    p_task_id,
    p_occurred_at,
    p_method,
    p_result,
    p_notes
  )
  returning id into v_follow_up_record_id;

  if p_task_id is not null then
    update public.tasks
    set
      status = 'completed',
      completed_at = now(),
      cancelled_at = null
    where id = p_task_id
      and talent_id = p_talent_id
      and user_id = v_user_id
      and status = 'pending'
    returning id into v_completed_task_id;

    if v_completed_task_id is null then
      raise exception 'Pending task could not be completed'
        using errcode = 'P0002';
    end if;
  end if;

  if p_next_stage is not null then
    update public.talents
    set stage = p_next_stage
    where id = p_talent_id
      and user_id = v_user_id
      and archived_at is null;

    if not found then
      raise exception 'Talent could not be updated'
        using errcode = 'P0002';
    end if;
  end if;

  if p_next_task_due_at is not null then
    insert into public.tasks (
      user_id,
      talent_id,
      task_type,
      status,
      due_at,
      notes
    )
    values (
      v_user_id,
      p_talent_id,
      p_next_task_type,
      'pending',
      p_next_task_due_at,
      p_next_task_notes
    )
    returning id into v_next_task_id;
  end if;

  return query
  select
    v_follow_up_record_id,
    v_completed_task_id,
    v_next_task_id;
end;
$$;

comment on function public.record_follow_up_and_schedule_next(
  uuid,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  text,
  text
) is 'Atomically records a follow-up, completes an optional task, updates an optional talent stage, and schedules an optional next task.';

revoke all on function public.record_follow_up_and_schedule_next(
  uuid,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  text,
  text
) from public;

revoke all on function public.record_follow_up_and_schedule_next(
  uuid,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  text,
  text
) from anon;

grant execute on function public.record_follow_up_and_schedule_next(
  uuid,
  timestamptz,
  text,
  text,
  text,
  uuid,
  text,
  timestamptz,
  text,
  text
) to authenticated;
