create or replace function public.convert_talent_resource(p_resource_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_resource public.talent_resources%rowtype;
  v_talent_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_resource
  from public.talent_resources
  where id = p_resource_id and user_id = v_user_id and status = 'new'
  for update;

  if not found then
    raise exception 'Resource not found or already converted' using errcode = 'P0002';
  end if;

  insert into public.talents (
    user_id, nickname, primary_platform, platform_account, profile_url,
    wechat, follower_count, tags, priority, stage, notes
  ) values (
    v_user_id, v_resource.nickname, v_resource.primary_platform,
    v_resource.platform_account, v_resource.profile_url, v_resource.wechat,
    v_resource.follower_count, array[v_resource.category],
    v_resource.priority, 'not_contacted', v_resource.notes
  ) returning id into v_talent_id;

  insert into public.follow_up_records (
    id, user_id, talent_id, occurred_at, method, result, notes, created_at, updated_at
  )
  select
    record.id,
    v_user_id,
    v_talent_id,
    record.occurred_at,
    record.method,
    case record.result when 'friend_request' then 'first_application' else record.result end,
    record.notes,
    record.created_at,
    record.updated_at
  from public.resource_contact_records as record
  where record.resource_id = p_resource_id
    and record.user_id = v_user_id
  on conflict (id) do nothing;

  update public.talent_resources
  set status = 'converted', converted_talent_id = v_talent_id, converted_at = now()
  where id = p_resource_id and user_id = v_user_id and status = 'new';

  if not found then
    raise exception 'Resource could not be converted' using errcode = 'P0002';
  end if;

  return v_talent_id;
end;
$$;

insert into public.follow_up_records (
  id, user_id, talent_id, occurred_at, method, result, notes, created_at, updated_at
)
select
  record.id,
  record.user_id,
  resource.converted_talent_id,
  record.occurred_at,
  record.method,
  case record.result when 'friend_request' then 'first_application' else record.result end,
  record.notes,
  record.created_at,
  record.updated_at
from public.resource_contact_records as record
join public.talent_resources as resource
  on resource.id = record.resource_id
 and resource.user_id = record.user_id
where resource.status = 'converted'
  and resource.converted_talent_id is not null
on conflict (id) do nothing;

create function public.complete_task_and_record_follow_up(
  p_task_id uuid,
  p_talent_id uuid
)
returns table (
  completed_task_id uuid,
  follow_up_record_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks%rowtype;
  v_record_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  select * into v_task
  from public.tasks
  where id = p_task_id
    and talent_id = p_talent_id
    and user_id = v_user_id
    and status = 'pending'
  for update;

  if not found then
    raise exception 'Pending task not found' using errcode = 'P0002';
  end if;

  update public.tasks
  set status = 'completed', completed_at = now(), cancelled_at = null
  where id = v_task.id
    and talent_id = v_task.talent_id
    and user_id = v_user_id
    and status = 'pending';

  if not found then
    raise exception 'Task could not be completed' using errcode = 'P0002';
  end if;

  insert into public.follow_up_records (
    user_id, talent_id, task_id, occurred_at, method, result, notes
  ) values (
    v_user_id,
    v_task.talent_id,
    v_task.id,
    now(),
    'other',
    'other',
    concat('已完成任务：', v_task.task_type, case when v_task.notes is null then '' else E'\n' || v_task.notes end)
  ) returning id into v_record_id;

  return query select v_task.id, v_record_id;
end;
$$;

revoke all on function public.complete_task_and_record_follow_up(uuid, uuid) from public;
revoke all on function public.complete_task_and_record_follow_up(uuid, uuid) from anon;
grant execute on function public.complete_task_and_record_follow_up(uuid, uuid) to authenticated;
