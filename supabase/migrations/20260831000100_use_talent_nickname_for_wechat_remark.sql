alter table public.wechat_message_templates
  alter column remark_template set default '{nickname}';

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
  new.execution_remark := trim(v_talent.nickname);

  return new;
end;
$$;

comment on column public.wechat_message_templates.remark_template is
  'Legacy compatibility field. New WeChat tasks always use the trimmed talent nickname as the immutable execution remark snapshot.';
