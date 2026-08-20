alter table public.talent_resources
add column next_action_at timestamptz default now();

update public.talent_resources
set next_action_at = null
where status = 'converted';

create index talent_resources_user_next_action_at_idx
on public.talent_resources (user_id, next_action_at)
where status = 'new';
