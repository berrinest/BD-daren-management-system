grant delete on table public.talent_resources to authenticated;

create policy "Users can delete their own unconverted talent resources"
on public.talent_resources
for delete
to authenticated
using ((select auth.uid()) = user_id and status = 'new');
