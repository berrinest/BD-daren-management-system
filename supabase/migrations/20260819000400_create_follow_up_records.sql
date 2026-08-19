create table public.follow_up_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  talent_id uuid not null,
  task_id uuid,
  occurred_at timestamptz not null default now(),
  method text not null default 'wechat',
  result text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint follow_up_records_talent_owner_fk
    foreign key (talent_id, user_id)
    references public.talents (id, user_id)
    on delete cascade,
  constraint follow_up_records_task_owner_fk
    foreign key (task_id, talent_id, user_id)
    references public.tasks (id, talent_id, user_id)
    on delete set null (task_id),
  constraint follow_up_records_method_valid check (
    method in ('wechat', 'phone', 'email', 'platform_message', 'other')
  ),
  constraint follow_up_records_result_valid check (
    result in (
      'first_application',
      'reapplication',
      'accepted',
      'rejected',
      'replied',
      'interested',
      'quote_sent',
      'quote_accepted',
      'quote_rejected',
      'cooperation',
      'no_response',
      'other'
    )
  )
);

comment on table public.follow_up_records is 'Outreach history for a talent.';

create index follow_up_records_user_id_occurred_at_idx
on public.follow_up_records (user_id, occurred_at desc);

create index follow_up_records_talent_id_occurred_at_idx
on public.follow_up_records (talent_id, occurred_at desc);

create trigger follow_up_records_set_updated_at
before update on public.follow_up_records
for each row
execute function public.set_updated_at();

alter table public.follow_up_records enable row level security;

revoke all on table public.follow_up_records from anon;
revoke all on table public.follow_up_records from authenticated;
grant select, insert, update on table public.follow_up_records to authenticated;

create policy "Users can read their own follow-up records"
on public.follow_up_records
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own follow-up records"
on public.follow_up_records
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own follow-up records"
on public.follow_up_records
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
