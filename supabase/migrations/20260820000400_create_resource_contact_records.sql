create table public.resource_contact_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null,
  occurred_at timestamptz not null default now(),
  method text not null default 'wechat',
  result text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_contact_records_resource_owner_fk
    foreign key (resource_id, user_id)
    references public.talent_resources (id, user_id)
    on delete cascade,
  constraint resource_contact_records_method_valid check (
    method in ('wechat', 'phone', 'email', 'platform_message', 'other')
  ),
  constraint resource_contact_records_result_valid check (
    result in (
      'friend_request',
      'reapplication',
      'accepted',
      'rejected',
      'replied',
      'no_response',
      'other'
    )
  )
);

comment on table public.resource_contact_records is 'Contact history recorded before a resource is converted to a talent.';

create index resource_contact_records_user_occurred_at_idx
on public.resource_contact_records (user_id, occurred_at desc);

create index resource_contact_records_resource_occurred_at_idx
on public.resource_contact_records (resource_id, occurred_at desc);

create trigger resource_contact_records_set_updated_at
before update on public.resource_contact_records
for each row execute function public.set_updated_at();

alter table public.resource_contact_records enable row level security;

revoke all on table public.resource_contact_records from anon;
revoke all on table public.resource_contact_records from authenticated;
grant select, insert, update on table public.resource_contact_records to authenticated;

create policy "Users can read their own resource contact records"
on public.resource_contact_records for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can insert their own resource contact records"
on public.resource_contact_records for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own resource contact records"
on public.resource_contact_records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
