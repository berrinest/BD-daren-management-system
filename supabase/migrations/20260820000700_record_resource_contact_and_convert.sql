create function public.record_resource_contact_and_maybe_convert(
  p_resource_id uuid,
  p_occurred_at timestamptz,
  p_method text,
  p_result text,
  p_notes text default null,
  p_next_action_at timestamptz default null
)
returns table (
  resource_contact_record_id uuid,
  converted_talent_id uuid
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_locked_resource_id uuid;
  v_record_id uuid;
  v_talent_id uuid;
  v_processing_status text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_method not in ('wechat', 'phone', 'email', 'platform_message', 'other') then
    raise exception 'Invalid contact method' using errcode = '22023';
  end if;

  if p_result not in (
    'friend_request', 'reapplication', 'accepted', 'rejected',
    'replied', 'no_response', 'other'
  ) then
    raise exception 'Invalid contact result' using errcode = '22023';
  end if;

  select id into v_locked_resource_id
  from public.talent_resources
  where id = p_resource_id
    and user_id = v_user_id
    and status = 'new'
  for update;

  if not found then
    raise exception 'Resource not found or already converted' using errcode = 'P0002';
  end if;

  insert into public.resource_contact_records (
    user_id, resource_id, occurred_at, method, result, notes
  ) values (
    v_user_id, p_resource_id, p_occurred_at, p_method, p_result, p_notes
  ) returning id into v_record_id;

  v_processing_status := case p_result
    when 'friend_request' then 'waiting_acceptance'
    when 'reapplication' then 'waiting_acceptance'
    when 'accepted' then 'contacted'
    when 'replied' then 'contacted'
    when 'rejected' then 'paused'
    when 'no_response' then 'attempted_add'
    else null
  end;

  update public.talent_resources
  set processing_status = coalesce(v_processing_status, processing_status),
      next_action_at = p_next_action_at
  where id = p_resource_id
    and user_id = v_user_id
    and status = 'new';

  if not found then
    raise exception 'Resource could not be updated' using errcode = 'P0002';
  end if;

  if p_result = 'accepted' then
    v_talent_id := public.convert_talent_resource(p_resource_id);
  end if;

  return query select v_record_id, v_talent_id;
end;
$$;

revoke all on function public.record_resource_contact_and_maybe_convert(uuid, timestamptz, text, text, text, timestamptz) from public;
revoke all on function public.record_resource_contact_and_maybe_convert(uuid, timestamptz, text, text, text, timestamptz) from anon;
grant execute on function public.record_resource_contact_and_maybe_convert(uuid, timestamptz, text, text, text, timestamptz) to authenticated;
