create table public.talent_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  nickname text not null,
  primary_platform text not null,
  platform_account text,
  profile_url text,
  wechat text,
  follower_count bigint,
  category text not null,
  priority text not null default 'normal',
  source text,
  notes text,
  status text not null default 'new',
  converted_talent_id uuid,
  converted_at timestamptz,
  discovered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint talent_resources_id_user_id_unique unique (id, user_id),
  constraint talent_resources_nickname_not_empty check (char_length(trim(nickname)) > 0),
  constraint talent_resources_follower_count_nonnegative check (follower_count is null or follower_count >= 0),
  constraint talent_resources_priority_valid check (priority in ('high', 'normal', 'paused')),
  constraint talent_resources_status_valid check (status in ('new', 'converted')),
  constraint talent_resources_conversion_state_valid check (
    (status = 'new' and converted_talent_id is null and converted_at is null)
    or (status = 'converted' and converted_talent_id is not null and converted_at is not null)
  ),
  constraint talent_resources_converted_talent_owner_fk
    foreign key (converted_talent_id, user_id)
    references public.talents (id, user_id)
);

create index talent_resources_user_status_discovered_idx
on public.talent_resources (user_id, status, discovered_at desc);

create index talent_resources_user_category_idx
on public.talent_resources (user_id, category);

create index talent_resources_user_priority_idx
on public.talent_resources (user_id, priority);

create trigger talent_resources_set_updated_at
before update on public.talent_resources
for each row execute function public.set_updated_at();

alter table public.talent_resources enable row level security;

revoke all on table public.talent_resources from anon;
revoke all on table public.talent_resources from authenticated;
grant select, insert, update on table public.talent_resources to authenticated;

create policy "Users can read their own talent resources"
on public.talent_resources for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own talent resources"
on public.talent_resources for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own talent resources"
on public.talent_resources for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create function public.convert_talent_resource(p_resource_id uuid)
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

  update public.talent_resources
  set status = 'converted', converted_talent_id = v_talent_id, converted_at = now()
  where id = p_resource_id and user_id = v_user_id and status = 'new';

  if not found then
    raise exception 'Resource could not be converted' using errcode = 'P0002';
  end if;

  return v_talent_id;
end;
$$;

revoke all on function public.convert_talent_resource(uuid) from public;
revoke all on function public.convert_talent_resource(uuid) from anon;
grant execute on function public.convert_talent_resource(uuid) to authenticated;
