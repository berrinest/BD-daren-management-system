alter table public.tasks
  add column agent_id text;

alter table public.tasks
  drop constraint tasks_status_valid,
  drop constraint tasks_status_timestamps_valid,
  add constraint tasks_status_valid check (
    status in ('pending', 'in_progress', 'completed', 'cancelled')
  ),
  add constraint tasks_status_timestamps_valid check (
    (
      status in ('pending', 'in_progress')
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
  ),
  add constraint tasks_agent_id_valid check (
    agent_id is null
    or (
      char_length(trim(agent_id)) between 3 and 100
      and agent_id = trim(agent_id)
    )
  ),
  add constraint tasks_agent_claim_valid check (
    (
      status = 'pending'
      and agent_id is null
      and started_at is null
    )
    or (
      status = 'in_progress'
      and agent_id is not null
      and started_at is not null
    )
    or status in ('completed', 'cancelled')
  );

create index tasks_user_agent_status_due_at_idx
on public.tasks (user_id, agent_id, status, due_at)
where agent_id is not null;

comment on column public.tasks.agent_id is
  'External executor identifier that claimed this task. It is scoped by user_id and is not an authentication identity.';
