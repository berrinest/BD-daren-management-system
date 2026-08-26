alter table public.tasks
  add column agent_current_action text,
  add column agent_last_error text;

alter table public.tasks
  add constraint tasks_agent_current_action_valid check (
    agent_current_action is null
    or (
      agent_current_action = trim(agent_current_action)
      and char_length(agent_current_action) between 1 and 100
    )
  ),
  add constraint tasks_agent_last_error_valid check (
    agent_last_error is null
    or (
      agent_last_error = trim(agent_last_error)
      and char_length(agent_last_error) between 1 and 1000
    )
  );

comment on column public.tasks.agent_current_action is
  'Latest safe Agent action reported for user-visible execution progress.';

comment on column public.tasks.agent_last_error is
  'Latest sanitized Agent failure reason; the task remains recoverable.';
