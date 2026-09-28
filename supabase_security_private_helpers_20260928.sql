-- UnaMano security helper hardening — 2026-09-28
-- Apply after supabase_security_20260928.sql when restoring an older snapshot.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_not_suspended()
returns boolean language sql stable security definer set search_path=public as $$
  select not exists (
    select 1 from public.user_suspensions s
    where s.user_id=(select auth.uid()) and s.active=true
  );
$$;
revoke all on function private.current_user_not_suspended() from public;
revoke all on function private.current_user_not_suspended() from anon;
grant execute on function private.current_user_not_suspended() to authenticated;

drop policy if exists jobs_insert on public.jobs;
create policy jobs_insert on public.jobs for insert to authenticated
with check ((select auth.uid())=owner_id and status='open' and assigned_to is null and private.current_user_not_suspended());

drop policy if exists applications_insert on public.applications;
create policy applications_insert on public.applications for insert to authenticated
with check ((select auth.uid())=applicant_id and status='pending' and private.current_user_not_suspended()
  and exists(select 1 from public.jobs j where j.id=applications.job_id and j.owner_id<>(select auth.uid()) and j.status='open'));

drop policy if exists messages_insert_sender on public.messages;
create policy messages_insert_sender on public.messages for insert to authenticated
with check (
  private.current_user_not_suspended()
  and (select auth.uid())=sender_id and sender_id<>recipient_id and job_id is not null
  and exists(select 1 from public.jobs j where j.id=messages.job_id and j.status in ('assigned','completed') and j.assigned_to is not null
    and ((j.owner_id=messages.sender_id and j.assigned_to=messages.recipient_id)
      or (j.assigned_to=messages.sender_id and j.owner_id=messages.recipient_id)))
);

drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
with check (
  private.current_user_not_suspended()
  and (select auth.uid())=author_id
  and exists(select 1 from public.jobs j where j.id=reviews.job_id and j.status='completed'
    and ((j.owner_id=reviews.author_id and j.assigned_to=reviews.subject_id)
      or (j.assigned_to=reviews.author_id and j.owner_id=reviews.subject_id)))
);

drop function if exists public.current_user_not_suspended();
revoke all on function public.enforce_unamano_insert_rate_limits() from public;
revoke all on function public.enforce_unamano_insert_rate_limits() from anon;
revoke all on function public.enforce_unamano_insert_rate_limits() from authenticated;
