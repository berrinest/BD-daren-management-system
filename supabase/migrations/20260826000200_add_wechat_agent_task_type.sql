alter table public.tasks
  drop constraint tasks_task_type_valid,
  add constraint tasks_task_type_valid check (
    task_type in (
      'follow_up',
      'quote_follow_up',
      'cooperation',
      'other',
      'wechat_add_friend'
    )
  );

comment on constraint tasks_task_type_valid on public.tasks is
  'Allowed BD task types, including the Windows Agent assisted WeChat friend-add task.';
