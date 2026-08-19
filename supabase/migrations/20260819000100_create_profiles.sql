create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Shanghai',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_timezone_not_empty check (char_length(trim(timezone)) > 0)
);

comment on table public.profiles is 'Application profile for a Supabase Auth user.';

alter table public.profiles enable row level security;

revoke all on table public.profiles from anon;
grant select, insert, update on table public.profiles to authenticated;

create policy "Users can read their own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

insert into public.profiles (id, display_name)
select
  users.id,
  coalesce(users.raw_user_meta_data ->> 'display_name', '')
from auth.users as users
on conflict (id) do nothing;
