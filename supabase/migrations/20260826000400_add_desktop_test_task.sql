alter table public.tasks
  drop constraint tasks_task_type_valid,
  add constraint tasks_task_type_valid check (
    task_type in (
      'follow_up',
      'quote_follow_up',
      'cooperation',
      'other',
      'wechat_add_friend',
      'desktop_test'
    )
  );

create or replace function public.complete_agent_task_result(
  p_task_id uuid,
  p_result_code text,
  p_result_notes text default null,
  p_next_action text default null,
  p_next_action_at timestamptz default null,
  p_occurred_at timestamptz default now()
)
returns table (
  task_id uuid,
  status text,
  result_code text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_task_type text;
  v_talent_id uuid;
  v_resource_id uuid;
  v_domain_result text;
  v_record_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_occurred_at is null then
    raise exception 'Result time is required' using errcode = '22023';
  end if;

  select t.task_type, t.talent_id, t.resource_id
  into v_task_type, v_talent_id, v_resource_id
  from public.tasks as t
  where t.id = p_task_id
    and t.user_id = v_user_id
    and t.status = 'in_progress'
  for update;

  if not found then
    raise exception 'Claimed task not found or unavailable' using errcode = 'P0002';
  end if;

  if v_task_type = 'desktop_test' then
    if p_result_code <> 'desktop_test_completed' then
      raise exception 'Result is not valid for a desktop test task' using errcode = '22023';
    end if;
  elsif v_talent_id is not null then
    v_domain_result := case p_result_code
      when 'friend_request_sent' then 'first_application'
      when 'replied' then 'replied'
      when 'interested' then 'interested'
      when 'quote_sent' then 'quote_sent'
      when 'cooperation_confirmed' then 'cooperation'
      when 'rejected' then 'rejected'
      else null
    end;

    if v_domain_result is null then
      raise exception 'Result is not valid for a talent task' using errcode = '22023';
    end if;

    select follow_up.follow_up_record_id
    into v_record_id
    from public.record_follow_up_and_schedule_next(
      p_talent_id => v_talent_id,
      p_occurred_at => p_occurred_at,
      p_method => 'wechat',
      p_result => v_domain_result,
      p_notes => p_result_notes,
      p_task_id => null
    ) as follow_up;

    if v_record_id is null then
      raise exception 'Talent follow-up could not be recorded' using errcode = 'P0002';
    end if;

    update public.follow_up_records as follow_up_record
    set task_id = p_task_id
    where follow_up_record.id = v_record_id
      and follow_up_record.talent_id = v_talent_id
      and follow_up_record.user_id = v_user_id
      and follow_up_record.task_id is null;

    if not found then
      raise exception 'Talent follow-up could not be linked to task' using errcode = 'P0002';
    end if;
  elsif v_resource_id is not null then
    v_domain_result := case p_result_code
      when 'friend_request_sent' then 'friend_request'
      when 'friend_request_accepted' then 'accepted'
      when 'no_response' then 'no_response'
      when 'rejected' then 'rejected'
      else null
    end;

    if v_domain_result is null then
      raise exception 'Result is not valid for a resource task' using errcode = '22023';
    end if;

    select resource_contact.resource_contact_record_id
    into v_record_id
    from public.record_resource_contact_and_maybe_convert(
      p_resource_id => v_resource_id,
      p_occurred_at => p_occurred_at,
      p_method => 'wechat',
      p_result => v_domain_result,
      p_notes => p_result_notes,
      p_next_action_at => p_next_action_at
    ) as resource_contact;

    if v_record_id is null then
      raise exception 'Resource contact could not be recorded' using errcode = 'P0002';
    end if;
  else
    raise exception 'Task has no valid target' using errcode = '23514';
  end if;

  update public.tasks as t
  set
    status = 'completed',
    completed_at = now(),
    cancelled_at = null,
    result_code = p_result_code,
    result_notes = p_result_notes,
    next_action = p_next_action,
    next_action_at = p_next_action_at
  where t.id = p_task_id
    and t.user_id = v_user_id
    and t.status = 'in_progress';

  if not found then
    raise exception 'Claimed task could not be completed' using errcode = 'P0002';
  end if;

  return query
  select p_task_id, 'completed'::text, p_result_code;
end;
$$;

comment on function public.complete_agent_task_result(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) is 'Atomically completes Agent tasks; desktop_test skips BD domain history by design.';

revoke all on function public.complete_agent_task_result(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from public;

revoke all on function public.complete_agent_task_result(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) from anon;

grant execute on function public.complete_agent_task_result(
  uuid,
  text,
  text,
  text,
  timestamptz,
  timestamptz
) to authenticated;
