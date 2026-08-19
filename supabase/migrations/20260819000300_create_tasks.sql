create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  talent_id uuid not null,
  task_type text not null default 'follow_up',
  status text not null default 'pending',
  due_at timestamptz not null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tasks_id_user_id_unique unique (id, user_id),
  constraint tasks_talent_owner_fk
    foreign key (talent_id, user_id)
    references public.talents (id, user_id)
    on delete cascade,
  constraint tasks_task_type_valid check (
    task_type in ('follow_up', 'quote_follow_up', 'cooperation', 'other')
  ),
  constraint tasks_status_valid check (
    status in ('pending', 'completed', 'cancelled')
  ),
  constraint tasks_status_timestamps_valid check (
    (
      status = 'pending'
      and completed_at is null
      and cancelled_at is null
    )
    or (
      status = 'completed'
      and completed_at is not null
      and cancelled_at is null
    )
    or (
      status = 'cancelled'
      and completed_at is null
      and cancelled_at is not null
    )
  )
);

comment on table public.tasks is 'Next actions for talent outreach and follow-up.';

create index tasks_user_id_status_due_at_idx
on public.tasks (user_id, status, due_at);

create index tasks_talent_id_created_at_idx
on public.tasks (talent_id, created_at desc);

create trigger tasks_set_updated_at
before update on public.tasks
for each row
execute function public.set_updated_at();

alter table public.tasks enable row level security;

revoke all on table public.tasks from anon;
grant select, insert, update on table public.tasks to authenticated;

create policy "Users can read their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
