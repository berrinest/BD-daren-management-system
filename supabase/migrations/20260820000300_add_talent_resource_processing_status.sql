alter table public.talent_resources
add column processing_status text not null default 'pending_add';

alter table public.talent_resources
add constraint talent_resources_processing_status_valid
check (processing_status in (
  'pending_add',
  'attempted_add',
  'waiting_acceptance',
  'contacted',
  'paused'
));

create index talent_resources_user_processing_status_idx
on public.talent_resources (user_id, processing_status);
