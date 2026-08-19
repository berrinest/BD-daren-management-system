create table public.talents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null,
  primary_platform text not null,
  platform_account text,
  profile_url text,
  wechat text,
  follower_count bigint,
  tags text[] not null default '{}'::text[],
  priority text not null default 'normal',
  stage text not null default 'not_contacted',
  notes text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talents_id_user_id_unique unique (id, user_id),
  constraint talents_nickname_not_empty check (char_length(trim(nickname)) > 0),
  constraint talents_primary_platform_not_empty check (
    char_length(trim(primary_platform)) > 0
  ),
  constraint talents_follower_count_nonnegative check (
    follower_count is null or follower_count >= 0
  ),
  constraint talents_priority_valid check (
    priority in ('high', 'normal', 'paused')
  ),
  constraint talents_stage_valid check (
    stage in (
      'not_contacted',
      'applied',
      'connected',
      'replied',
      'interested',
      'quoting',
      'confirmed',
      'completed',
      'rejected'
    )
  )
);

comment on table public.talents is 'Talent profiles owned by an application user.';

create index talents_user_id_stage_idx
on public.talents (user_id, stage);

create index talents_user_id_priority_idx
on public.talents (user_id, priority);

create index talents_user_id_primary_platform_idx
on public.talents (user_id, primary_platform);

create index talents_tags_idx
on public.talents using gin (tags);

create trigger talents_set_updated_at
before update on public.talents
for each row
execute function public.set_updated_at();

alter table public.talents enable row level security;

revoke all on table public.talents from anon;
grant select, insert, update on table public.talents to authenticated;

create policy "Users can read their own talents"
on public.talents
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own talents"
on public.talents
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own talents"
on public.talents
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
