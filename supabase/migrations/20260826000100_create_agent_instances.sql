create table public.agent_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  installation_id uuid not null,
  device_name text not null,
  agent_type text not null default 'windows',
  version text not null,
  status text not null default 'active',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_instances_user_installation_unique unique (user_id, installation_id),
  constraint agent_instances_id_user_id_unique unique (id, user_id),
  constraint agent_instances_device_name_not_empty check (char_length(trim(device_name)) between 1 and 100),
  constraint agent_instances_device_name_trimmed check (device_name = trim(device_name)),
  constraint agent_instances_agent_type_valid check (agent_type = 'windows'),
  constraint agent_instances_version_not_empty check (char_length(trim(version)) between 1 and 50),
  constraint agent_instances_version_trimmed check (version = trim(version)),
  constraint agent_instances_status_valid check (status in ('active', 'paused', 'revoked'))
);

comment on table public.agent_instances is
  'Windows Agent installations registered by an authenticated BD user.';

comment on column public.agent_instances.installation_id is
  'Stable random identifier generated locally for idempotent device registration; it is not an authentication credential.';

comment on column public.agent_instances.last_seen_at is
  'Server-authored timestamp of the most recent successful Agent heartbeat.';

create index agent_instances_user_status_last_seen_idx
on public.agent_instances (user_id, status, last_seen_at desc);

create trigger agent_instances_set_updated_at
before update on public.agent_instances
for each row execute function public.set_updated_at();

alter table public.agent_instances enable row level security;

revoke all on table public.agent_instances from anon;
revoke all on table public.agent_instances from authenticated;
grant select, insert, update on table public.agent_instances to authenticated;

create policy "Users can read their own agent instances"
on public.agent_instances for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can register their own agent instances"
on public.agent_instances for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own agent instances"
on public.agent_instances for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
