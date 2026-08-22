alter table public.tasks
  add column resource_id uuid,
  add column creator_id uuid default auth.uid(),
  add column started_at timestamptz,
  add column result_code text,
  add column result_notes text,
  add column next_action text,
  add column next_action_at timestamptz,
  add column execution_source text not null default 'manual';

update public.tasks
set creator_id = user_id
where creator_id is null;

alter table public.tasks
  alter column creator_id set not null,
  alter column talent_id drop not null,
  add constraint tasks_creator_id_fkey
    foreign key (creator_id)
    references public.profiles (id)
    on delete restrict,
  add constraint tasks_resource_owner_fk
    foreign key (resource_id, user_id)
    references public.talent_resources (id, user_id)
    on delete restrict,
  add constraint tasks_exactly_one_target_check check (
    (talent_id is not null and resource_id is null)
    or
    (talent_id is null and resource_id is not null)
  ),
  add constraint tasks_creator_matches_owner_check check (
    creator_id = user_id
  ),
  add constraint tasks_execution_source_valid check (
    execution_source in ('manual', 'agent')
  ),
  add constraint tasks_result_code_not_empty check (
    result_code is null or char_length(trim(result_code)) > 0
  ),
  add constraint tasks_result_notes_not_empty check (
    result_notes is null or char_length(trim(result_notes)) > 0
  ),
  add constraint tasks_next_action_not_empty check (
    next_action is null or char_length(trim(next_action)) > 0
  );

create index tasks_user_resource_status_due_at_idx
on public.tasks (user_id, resource_id, status, due_at)
where resource_id is not null;

create index tasks_user_creator_created_at_idx
on public.tasks (user_id, creator_id, created_at desc);

create index tasks_user_status_next_action_at_idx
on public.tasks (user_id, status, next_action_at)
where next_action_at is not null;

comment on column public.tasks.resource_id is
  'Unconverted talent resource targeted by this task. Exactly one of resource_id and talent_id must be set.';

comment on column public.tasks.creator_id is
  'Authenticated user who created the task. Equals user_id in the personal MVP.';

comment on column public.tasks.started_at is
  'Time when manual or assisted execution started.';

comment on column public.tasks.result_code is
  'Structured execution result code reserved for the BD execution workflow.';

comment on column public.tasks.result_notes is
  'Human-readable execution result details.';

comment on column public.tasks.next_action is
  'Human-readable action that should follow this task.';

comment on column public.tasks.next_action_at is
  'Suggested time for the next action after this task.';

comment on column public.tasks.execution_source is
  'Execution source: manual today and agent-assisted in a future phase.';
