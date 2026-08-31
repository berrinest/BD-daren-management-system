alter table public.talents
  add column talent_level text;

update public.talents
set talent_level = 'B'
where talent_level is null;

alter table public.talents
  alter column talent_level set default 'B',
  alter column talent_level set not null,
  add constraint talents_talent_level_valid check (
    talent_level in ('A', 'B', 'C')
  );

create index talents_user_id_talent_level_idx
on public.talents (user_id, talent_level)
where archived_at is null;

comment on column public.talents.talent_level is
  'Fixed A/B/C outreach level used to select the WeChat execution template.';

create table public.wechat_message_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  talent_level text not null,
  template_name text not null,
  greeting_message text not null,
  remark_template text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wechat_message_templates_user_level_unique unique (user_id, talent_level),
  constraint wechat_message_templates_talent_level_valid check (
    talent_level in ('A', 'B', 'C')
  ),
  constraint wechat_message_templates_name_valid check (
    template_name = trim(template_name)
    and char_length(template_name) between 1 and 100
  ),
  constraint wechat_message_templates_greeting_valid check (
    greeting_message = trim(greeting_message)
    and char_length(greeting_message) between 1 and 500
    and replace(
      replace(
        replace(greeting_message, '{nickname}', ''),
        '{platform}', ''
      ),
      '{account}', ''
    ) !~ '[{}]'
  ),
  constraint wechat_message_templates_remark_valid check (
    remark_template = trim(remark_template)
    and char_length(remark_template) between 1 and 100
    and replace(
      replace(
        replace(remark_template, '{nickname}', ''),
        '{platform}', ''
      ),
      '{account}', ''
    ) !~ '[{}]'
  )
);

comment on table public.wechat_message_templates is
  'Per-user A/B/C WeChat greeting and remark templates. Supported variables are validated by the application before writes.';

create index wechat_message_templates_user_enabled_idx
on public.wechat_message_templates (user_id, enabled, talent_level);

create trigger wechat_message_templates_set_updated_at
before update on public.wechat_message_templates
for each row
execute function public.set_updated_at();

alter table public.wechat_message_templates enable row level security;

revoke all on table public.wechat_message_templates from anon;
revoke all on table public.wechat_message_templates from authenticated;
grant select, insert, update on table public.wechat_message_templates to authenticated;

create policy "Users can read their own WeChat message templates"
on public.wechat_message_templates
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own WeChat message templates"
on public.wechat_message_templates
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own WeChat message templates"
on public.wechat_message_templates
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
